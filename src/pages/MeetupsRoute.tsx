import { useLocation, useParams } from "react-router-dom";
import type { Creator, StitchingMeetup, Store } from "../types";
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
  onRegister,
  onJoinWaitlist,
  onCancelRegistration,
  onCancel,
  registerBusy,
  canUseMine = true,
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
  onRegister: (meetupId: string) => void;
  onJoinWaitlist: (meetupId: string) => void;
  onCancelRegistration: (meetupId: string) => void;
  onCancel?: (meetupId: string) => void;
  registerBusy?: boolean;
  canUseMine?: boolean;
}) {
  const { id } = useParams();
  const location = useLocation();
  const mineTab = location.pathname === "/meetups/mine" || location.pathname.startsWith("/meetups/mine/");

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
        tab={mineTab ? "mine" : "browse"}
        viewerId={viewerId}
        canUseMine={canUseMine}
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
        onAction={() => setView({ name: "meetups", tab: "browse" })}
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
      onRegister={() => onRegister(meetup.id)}
      onJoinWaitlist={() => onJoinWaitlist(meetup.id)}
      onCancelRegistration={() => onCancelRegistration(meetup.id)}
      onCancel={onCancel ? () => onCancel(meetup.id) : undefined}
      registerBusy={registerBusy}
    />
  );
}
