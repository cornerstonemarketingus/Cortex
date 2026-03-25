import Pusher from 'pusher';

type RealtimeResult = {
  published: boolean;
  reason?: string;
};

let pusherClient: Pusher | null | undefined;

function getPusherClient() {
  if (pusherClient !== undefined) {
    return pusherClient;
  }

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) {
    pusherClient = null;
    return pusherClient;
  }

  pusherClient = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });

  return pusherClient;
}

export async function publishRealtimeEvent(
  channel: string,
  event: string,
  payload: unknown
): Promise<RealtimeResult> {
  const client = getPusherClient();

  if (!client) {
    return {
      published: false,
      reason: 'Pusher credentials are not configured',
    };
  }

  await client.trigger(channel, event, payload);

  return {
    published: true,
  };
}
