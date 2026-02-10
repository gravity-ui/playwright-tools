export const TestComponent = () => <div data-testid="test-component">Hello World</div>;

export const ComplexComponent = () => (
    <div>
        <h1>Title</h1>
        <button onClick={() => alert('clicked')}>Click me</button>
        <ul>
            <li>Item 1</li>
            <li>Item 2</li>
        </ul>
    </div>
);
