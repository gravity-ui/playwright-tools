export function RequestTestComponent() {
    const handleGetRequest = async () => {
        await fetch('/api/users?page=1&limit=10');
    };

    const handlePostRequest = async () => {
        await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: 'John Doe',
                email: 'john@example.com',
            }),
        });
    };

    return (
        <div data-testid="request-test-component">
            <button data-testid="get-button" onClick={handleGetRequest}>
                Make GET Request
            </button>
            <button data-testid="post-button" onClick={handlePostRequest}>
                Make POST Request
            </button>
        </div>
    );
}
