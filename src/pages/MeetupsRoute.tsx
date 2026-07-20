import { useParams } from "react-router-dom";
import type { Creator, StitchingMeetup, StitchingMeetupRsvpStatus, Store } from "../types";
import type { View } from "../appModel";
import type { StitchingMeetupInput } from "../api/meetups";
import { EmptyState } from "../components/ui";
import { MeetupDetailView, MeetupsListView } from "./MeetupsPage";

export function MeetupsRoute({
  meetups,
  stores,
  creatorById,
  setView,
  canHost,
  viewerId,
  ownedStoreId,
  onCreate,
  createBusy,
  createError,
  onRsvp,
  onCancel,
  rsvpBusy,
}: {
  meetups: StitchingMeetup[];
  stores: Store[];
  creatorById: (id: string) => Creator;
  setView: (view: View) => void;
  canHost: boolean;
  viewerId: string | null;
  ownedStoreId?: string | null;
  onCreate?: (input: StitchingMeetupInput) => void | Promise<void>;
  createBusy?: boolean;
  createError?: string;
  onRsvp: (meetupId: string, status: StitchingMeetupRsvpStatus | null) => void;
  onCancel?: (meetupId: string) => void;
  rsvpBusy?: boolean;
}) {
  const { id } = useParams();

  if (!id) {
    return (
      <MeetupsListView
        meetups={meetups}
        stores={stores}
        creatorById={creatorById}
        setView={setView}
        canHost={canHost}
        onCreate={onCreate}
        createBusy={createBusy}
        createError={createError}
        ownedStoreId={ownedStoreId}
      />
    );
  }

  const meetup = meetups.find((m) => m.id === id);
  if (!meetup) {
    return (
      <EmptyState
        variant="detail"
        minHeight={280}
        title="Meetup not found"
        body="That stitching night may have been cancelled or the link is outdated."
        action="Browse meetups"
        onAction={() => setView({ name: "meetups" })}
      />
    );
  }

  return (
    <MeetupDetailView
      meetup={meetup}
      stores={stores}
      creatorById={creatorById}
      setView={setView}
      isHost={Boolean(viewerId && meetup.hostId === viewerId)}
      onRsvp={(status) => onRsvp(meetup.id, status)}
      onCancel={onCancel ? () => onCancel(meetup.id) : undefined}
      rsvpBusy={rsvpBusy}
    />
  );
}
