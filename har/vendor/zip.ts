/**
 * NOT derived from Playwright: an original minimal ZIP reader/writer for HAR
 * archives, licensed under this package's MIT license like the rest of the repo.
 * Playwright's own HAR archives are produced by `zipBundle` (yazl/yauzl), which
 * is not vendored here. Re-syncing `vendor/` against upstream must skip this file.
 */
/* eslint-disable no-bitwise -- binary format parsing and CRC-32 need bit arithmetic */
import { readFile, writeFile } from 'node:fs/promises';
import { deflateRawSync, inflateRawSync } from 'node:zlib';

const EOCD_SIGNATURE = 0x06054b50;
const ZIP64_LOCATOR_SIGNATURE = 0x07064b50;
const CENTRAL_FILE_SIGNATURE = 0x02014b50;
const LOCAL_FILE_SIGNATURE = 0x04034b50;

const METHOD_STORE = 0;
const METHOD_DEFLATE = 8;

const MAX_COMMENT_SIZE = 0xffff;
const MAX_ENTRIES = 0xffff;
const MAX_OFFSET = 0xffffffff;

let crcTable: Uint32Array | undefined;

function getCrcTable() {
    if (!crcTable) {
        crcTable = new Uint32Array(256);

        for (let i = 0; i < 256; i++) {
            let value = i;

            for (let bit = 0; bit < 8; bit++) {
                value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
            }

            crcTable[i] = value >>> 0;
        }
    }

    return crcTable;
}

function crc32(buffer: Buffer) {
    const table = getCrcTable();
    let crc = 0xffffffff;

    for (const byte of buffer) {
        crc = table[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
}

function findEndOfCentralDirectory(buffer: Buffer) {
    const start = Math.max(0, buffer.length - 22 - MAX_COMMENT_SIZE);

    for (let offset = buffer.length - 22; offset >= start; offset--) {
        if (buffer.readUInt32LE(offset) === EOCD_SIGNATURE) {
            return offset;
        }
    }

    return -1;
}

/**
 * Reads all entries of a ZIP archive into memory.
 *
 * Sizes are taken from the central directory on purpose: Playwright writes HAR
 * archives with the "data descriptor" flag (0x808) set, which leaves the sizes
 * in the local file headers zeroed out.
 */
export async function readZipEntries(file: string): Promise<Map<string, Buffer>> {
    const buffer = await readFile(file);
    const endOfCentralDirectory = findEndOfCentralDirectory(buffer);

    if (endOfCentralDirectory < 0) {
        throw new Error(`Not a ZIP archive: ${file}`);
    }

    let count = buffer.readUInt16LE(endOfCentralDirectory + 10);
    let centralDirectoryOffset = buffer.readUInt32LE(endOfCentralDirectory + 16);

    // A ZIP64 archive keeps the real numbers in its own end-of-central-directory
    // record, found through the locator right before the classic one.
    if (centralDirectoryOffset === MAX_OFFSET || count === MAX_ENTRIES) {
        const locator = endOfCentralDirectory - 20;

        if (locator < 0 || buffer.readUInt32LE(locator) !== ZIP64_LOCATOR_SIGNATURE) {
            throw new Error(`ZIP64 archive without a ZIP64 locator: ${file}`);
        }

        const zip64Offset = Number(buffer.readBigUInt64LE(locator + 8));

        count = Number(buffer.readBigUInt64LE(zip64Offset + 32));
        centralDirectoryOffset = Number(buffer.readBigUInt64LE(zip64Offset + 48));
    }

    const entries = new Map<string, Buffer>();
    let position = centralDirectoryOffset;

    for (let index = 0; index < count; index++) {
        if (buffer.readUInt32LE(position) !== CENTRAL_FILE_SIGNATURE) {
            throw new Error(`Broken central directory in ZIP archive: ${file}`);
        }

        const method = buffer.readUInt16LE(position + 10);
        const compressedSize = buffer.readUInt32LE(position + 20);
        const nameLength = buffer.readUInt16LE(position + 28);
        const extraLength = buffer.readUInt16LE(position + 30);
        const commentLength = buffer.readUInt16LE(position + 32);
        const localOffset = buffer.readUInt32LE(position + 42);
        const name = buffer.toString('utf8', position + 46, position + 46 + nameLength);

        if (compressedSize === MAX_OFFSET || localOffset === MAX_OFFSET) {
            throw new Error(
                `ZIP64 entries (a member or an archive of 4 GiB or more) are not supported: ${name} in ${file}`,
            );
        }

        const localNameLength = buffer.readUInt16LE(localOffset + 26);
        const localExtraLength = buffer.readUInt16LE(localOffset + 28);
        const dataStart = localOffset + 30 + localNameLength + localExtraLength;
        const raw = buffer.subarray(dataStart, dataStart + compressedSize);

        entries.set(name, method === METHOD_STORE ? Buffer.from(raw) : inflateRawSync(raw));

        position += 46 + nameLength + extraLength + commentLength;
    }

    return entries;
}

/**
 * Writes a ZIP archive readable by Playwright itself.
 */
export async function writeZipEntries(file: string, entries: Map<string, Buffer>): Promise<void> {
    if (entries.size > MAX_ENTRIES) {
        throw new Error(
            `Too many members for a HAR archive without ZIP64 support: ${entries.size} in ${file}, ` +
                `at most ${MAX_ENTRIES} can be written`,
        );
    }

    const localParts: Buffer[] = [];
    const centralParts: Buffer[] = [];
    let offset = 0;

    for (const [name, content] of entries) {
        const nameBuffer = Buffer.from(name, 'utf8');
        const deflated = deflateRawSync(content);
        const useDeflate = deflated.length < content.length;
        const payload = useDeflate ? deflated : content;
        const method = useDeflate ? METHOD_DEFLATE : METHOD_STORE;
        const checksum = crc32(content);

        const localHeader = Buffer.alloc(30);

        localHeader.writeUInt32LE(LOCAL_FILE_SIGNATURE, 0);
        localHeader.writeUInt16LE(20, 4);
        // Bit 11 — file name is UTF-8 encoded.
        localHeader.writeUInt16LE(0x800, 6);
        localHeader.writeUInt16LE(method, 8);
        localHeader.writeUInt32LE(checksum, 14);
        localHeader.writeUInt32LE(payload.length, 18);
        localHeader.writeUInt32LE(content.length, 22);
        localHeader.writeUInt16LE(nameBuffer.length, 26);

        localParts.push(localHeader, nameBuffer, payload);

        const centralHeader = Buffer.alloc(46);

        centralHeader.writeUInt32LE(CENTRAL_FILE_SIGNATURE, 0);
        centralHeader.writeUInt16LE(20, 4);
        centralHeader.writeUInt16LE(20, 6);
        centralHeader.writeUInt16LE(0x800, 8);
        centralHeader.writeUInt16LE(method, 10);
        centralHeader.writeUInt32LE(checksum, 16);
        centralHeader.writeUInt32LE(payload.length, 20);
        centralHeader.writeUInt32LE(content.length, 24);
        centralHeader.writeUInt16LE(nameBuffer.length, 28);
        centralHeader.writeUInt32LE(offset, 42);

        centralParts.push(centralHeader, nameBuffer);

        offset += localHeader.length + nameBuffer.length + payload.length;

        if (offset > MAX_OFFSET) {
            throw new Error(
                `HAR archive too large without ZIP64 support: ${file} exceeds 4 GiB at ${name}`,
            );
        }
    }

    const centralDirectory = Buffer.concat(centralParts);
    const endOfCentralDirectory = Buffer.alloc(22);

    endOfCentralDirectory.writeUInt32LE(EOCD_SIGNATURE, 0);
    endOfCentralDirectory.writeUInt16LE(entries.size, 8);
    endOfCentralDirectory.writeUInt16LE(entries.size, 10);
    endOfCentralDirectory.writeUInt32LE(centralDirectory.length, 12);
    endOfCentralDirectory.writeUInt32LE(offset, 16);

    await writeFile(file, Buffer.concat([...localParts, centralDirectory, endOfCentralDirectory]));
}
