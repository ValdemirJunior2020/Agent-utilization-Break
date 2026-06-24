import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="grid min-h-[70vh] place-items-center text-center">
      <div>
        <h1 className="text-5xl font-black text-slate-950">404</h1>
        <p className="mt-3 text-slate-500">Page not found.</p>
        <Link to="/"><Button className="mt-6">Back to Dashboard</Button></Link>
      </div>
    </div>
  );
}
