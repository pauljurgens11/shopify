/** Create-account skeleton — overrides the account skeleton for this route. */
import { AuthSkeleton } from '../../../components/skeleton.tsx';

export default function Loading() {
  return <AuthSkeleton fields={4} />;
}
