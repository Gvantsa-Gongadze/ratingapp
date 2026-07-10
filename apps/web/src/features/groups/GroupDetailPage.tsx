import { useParams } from 'react-router-dom';

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <section className="group-detail-page">
      <h1>Group {id}</h1>
      <p className="placeholder-copy">
        This screen will show group members, shared rankings, and activity.
      </p>
    </section>
  );
}
