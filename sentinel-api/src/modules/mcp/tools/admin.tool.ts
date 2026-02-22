import { Client, Campaign, ChannelContext } from '../../shared/db/models';
import { UserContext } from './campaigns.tool';

export class PermissionDeniedError extends Error {
  constructor(
    message: string,
    public readonly ownerSlackUserId: string | undefined,
    public readonly attemptedAction: string,
    public readonly requesterSlackUserId: string | undefined
  ) {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

function requireOwner(ctx: UserContext, action: string) {
  if (ctx.slackUserId && ctx.ownerSlackUserId && ctx.slackUserId !== ctx.ownerSlackUserId) {
    throw new PermissionDeniedError(
      `Only the main Sentinel user can ${action}. Please contact them to perform this action.`,
      ctx.ownerSlackUserId,
      action,
      ctx.slackUserId
    );
  }
}

export async function linkChannelToClient(
  args: { clientId: string; channelId?: string },
  ctx: UserContext
) {
  requireOwner(ctx, 'link a Slack channel to a client');

  const channelId = args.channelId || ctx.slackChannelId;
  if (!channelId) throw new Error('No channel ID available');

  const client = await Client.findOne({ _id: args.clientId, userId: ctx.userId });
  if (!client) throw new Error('Client not found');

  client.slackChannelId = channelId;
  await client.save();

  // Update an existing ChannelContext for this channel to reference the client
  if (ctx.slackTeamId) {
    await ChannelContext.findOneAndUpdate(
      { slackChannelId: channelId, teamId: ctx.slackTeamId },
      { clientId: client._id }
    );
  }

  return {
    success: true,
    message: `Channel linked to client "${client.name}". Reports for this client will now appear in this channel.`,
  };
}

export async function unlinkChannelFromClient(
  args: { clientId: string },
  ctx: UserContext
) {
  requireOwner(ctx, 'unlink a Slack channel from a client');

  const client = await Client.findOne({ _id: args.clientId, userId: ctx.userId });
  if (!client) throw new Error('Client not found');

  const prevChannelId = client.slackChannelId;
  client.slackChannelId = '';
  await client.save();

  // Remove the client reference from the ChannelContext so the channel becomes unlinked
  if (prevChannelId && ctx.slackTeamId) {
    await ChannelContext.findOneAndUpdate(
      { slackChannelId: prevChannelId, teamId: ctx.slackTeamId },
      { $unset: { clientId: '' } }
    );
  }

  return {
    success: true,
    message: `Channel successfully unlinked from client "${client.name}".`,
  };
}

export async function deleteClientTool(
  args: { clientId: string },
  ctx: UserContext
) {
  requireOwner(ctx, 'delete a client');

  const client = await Client.findOne({ _id: args.clientId, userId: ctx.userId });
  if (!client) throw new Error('Client not found');

  const clientName = client.name;

  const [campaignResult, contextResult] = await Promise.all([
    Campaign.deleteMany({ clientId: args.clientId }),
    ChannelContext.deleteMany({ clientId: args.clientId }),
  ]);

  await client.deleteOne();

  return {
    success: true,
    message: `Client "${clientName}" deleted along with ${campaignResult.deletedCount} campaign(s) and ${contextResult.deletedCount} channel context(s).`,
  };
}
