/** Sign-in skeleton — overrides the account skeleton for this nested route. */
import { AuthSkeleton } from '../../../components/skeleton.tsx';

export default function Loading() {
  return <AuthSkeleton fields={2} />;
}
