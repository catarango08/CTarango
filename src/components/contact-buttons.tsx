/** Tap-to-call / tap-to-text / directions. Internal screens only (directions uses the street address). */
export function ContactButtons({ phone, address, showDirections = true }: { phone?: string; address?: string; showDirections?: boolean }) {
  const tel = (phone ?? '').replace(/[^\d+]/g, '');
  const cols = [tel, tel, showDirections && address].filter(Boolean).length || 1;
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {tel && <a href={`tel:${tel}`} className="btn-primary min-h-14 text-base">📞 Call</a>}
      {tel && <a href={`sms:${tel}`} className="btn min-h-14 justify-center text-base">💬 Text</a>}
      {showDirections && address && (
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer" className="btn min-h-14 justify-center text-base">🧭 Go</a>
      )}
    </div>
  );
}
