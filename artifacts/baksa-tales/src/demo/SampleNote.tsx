import { resetDemo } from './store';

export default function SampleNote({ inline = false }: { inline?: boolean }) {
  return <div className="bt-sample" data-testid="sample-note" style={inline ? {
    position: 'static', maxWidth: 'none', justifyContent: 'center', borderRadius: 0,
    margin: 0, padding: '8px 24px', background: '#752F43',
  } : undefined}>
    <span>Sample data. Nothing is sent or charged.</span>
    <button type="button" data-testid="button-reset-demo" onClick={() => {
      if (window.confirm('Reset the sample data to how it started?')) {
        resetDemo();
        try { sessionStorage.clear(); } catch { /* browser storage may be unavailable */ }
        window.location.reload();
      }
    }}>Reset demo data</button>
  </div>;
}
