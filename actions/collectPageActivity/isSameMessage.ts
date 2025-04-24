import type { ExpectedMessage } from './types';

export const isSameMessage = (type: string, text: string) => {
    return (message: ExpectedMessage) => {
        const isSameText =
            message.text instanceof RegExp ? message.text.test(text) : message.text === text;
        return message.type === type && isSameText;
    };
};
