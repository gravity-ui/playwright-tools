export function ScreenshotTestComponent() {
    return (
        <div
            data-testid="screenshot-test-component"
            style={{
                padding: '20px',
                backgroundColor: '#f0f0f0',
                borderRadius: '8px',
                textAlign: 'center',
            }}
        >
            <h1 style={{ color: '#333', fontSize: '24px', margin: '0 0 10px 0' }}>
                Screenshot Test
            </h1>
            <p style={{ color: '#666', margin: 0 }}>
                This is a simple component for screenshot testing
            </p>
        </div>
    );
}
