/**
 * Demo layout without header
 * 
 * This layout removes the main header for a fullscreen demo experience
 */
export default function DemoLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
