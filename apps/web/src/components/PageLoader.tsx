export function PageLoader({ fullPage = false }: { fullPage?: boolean }) {
  return (
    <div
      className={fullPage ? 'page-loader page-loader--full' : 'page-loader'}
      role="status"
      aria-label="Loading"
    >
      <span className="spinner" />
    </div>
  );
}
