import { useParams } from 'react-router-dom';

export function UserProfilePage() {
  const { username } = useParams<{ username: string }>();

  return (
    <section className="user-profile-page">
      <h1>@{username}</h1>
      <p className="placeholder-copy">
        This screen will show this user's rating history and profile info.
      </p>
    </section>
  );
}
