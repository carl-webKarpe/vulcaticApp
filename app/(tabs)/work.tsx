import { ScrollView } from 'react-native';

import { EmptyState } from '@/components/EmptyState';

/** Earnings and jobs arrive with requests in 2.0.0. No made-up numbers until then. */
export default function Work() {
  return (
    <ScrollView>
      <EmptyState title="No jobs yet" message="Your jobs, earnings and ratings will show here when customers can send requests in the app." />
    </ScrollView>
  );
}
