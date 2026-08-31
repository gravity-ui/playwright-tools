import { useState } from 'react';

export const StatefulComponent = ({ text }: { text: string }) => {
    const [count, setCount] = useState(0);

    return (
        <div>
            <p>
                {text}: {count}
            </p>
            <button onClick={() => setCount((prev) => prev + 1)}>Increment</button>
        </div>
    );
};
