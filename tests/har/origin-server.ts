import { createServer } from 'node:http';
import type { Server } from 'node:http';

export type OriginServer = {
    baseURL: string;
    /**
     * Flipped after recording: anything the replayed page still fetches for real
     * shows up as `LIVE` instead of `RECORDED`.
     */
    setPayload: (payload: string) => void;
    close: () => Promise<void>;
};

const PAGE = `<!DOCTYPE html>
<html>
    <body>
        <div id="out">initial</div>
        <script>
            fetch('/api')
                .then((response) => response.text())
                .then((text) => {
                    document.getElementById('out').textContent = text;
                });
        </script>
    </body>
</html>`;

export async function startOriginServer(): Promise<OriginServer> {
    let payload = 'RECORDED';

    const server: Server = createServer((request, response) => {
        if (request.url === '/api') {
            response.writeHead(200, {
                'content-type': 'application/json',
                'set-cookie': 'session=must-not-be-recorded',
            });
            response.end(JSON.stringify({ payload }));

            return;
        }

        if (request.url === '/moved') {
            response.writeHead(302, { location: '/' });
            response.end();

            return;
        }

        response.writeHead(200, {
            'content-type': 'text/html',
            'set-cookie': 'session=must-not-be-recorded',
        });
        response.end(PAGE);
    });

    await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address();

    if (address === null || typeof address === 'string') {
        throw new Error('Failed to start the origin server');
    }

    return {
        baseURL: `http://127.0.0.1:${address.port}`,
        setPayload: (next) => {
            payload = next;
        },
        close: () =>
            new Promise<void>((resolve, reject) => {
                server.close((error) => (error ? reject(error) : resolve()));
            }),
    };
}
