interface WidgetGridProps {
  children: React.ReactNode;
}

export function WidgetGrid({ children }: WidgetGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 pb-6 sm:px-6 md:grid-cols-2 lg:px-8 xl:grid-cols-3">
      {children}
    </div>
  );
}
