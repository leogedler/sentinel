import mongoose from 'mongoose';
import { Client, Campaign } from '../../shared/db/models';
import { UserContext } from './campaigns.tool';

interface SearchArgs {
  query: string;
  type?: 'client' | 'campaign' | 'both';
}

function isObjectId(value: string): boolean {
  return mongoose.Types.ObjectId.isValid(value) && value.length === 24;
}

export async function searchClientsCampaigns(args: SearchArgs, ctx: UserContext) {
  const { query, type = 'both' } = args;
  const searchById = isObjectId(query);

  const clients: { id: string; name: string; slackChannelId: string }[] = [];
  const campaigns: { id: string; name: string; clientId: string; clientName: string }[] = [];

  if (type === 'client' || type === 'both') {
    const filter = searchById
      ? { _id: query, userId: ctx.userId }
      : { userId: ctx.userId, name: { $regex: query, $options: 'i' } };

    const found = await Client.find(filter).limit(10);
    for (const c of found) {
      clients.push({ id: String(c._id), name: c.name, slackChannelId: c.slackChannelId });
    }
  }

  if (type === 'campaign' || type === 'both') {
    if (searchById) {
      const campaign = await Campaign.findById(query).populate<{ clientId: { _id: mongoose.Types.ObjectId; name: string; userId: mongoose.Types.ObjectId } }>('clientId');
      if (campaign && String((campaign.clientId as any).userId) === ctx.userId) {
        campaigns.push({
          id: String(campaign._id),
          name: campaign.name,
          clientId: String((campaign.clientId as any)._id),
          clientName: (campaign.clientId as any).name,
        });
      }
    } else {
      // Search campaigns belonging to this user's clients
      const userClientIds = await Client.find({ userId: ctx.userId }).distinct('_id');
      const found = await Campaign.find({
        clientId: { $in: userClientIds },
        name: { $regex: query, $options: 'i' },
      }).limit(20);

      // Attach client names
      const clientMap = new Map<string, string>();
      const clientDocs = await Client.find({ _id: { $in: userClientIds } });
      for (const c of clientDocs) clientMap.set(String(c._id), c.name);

      for (const c of found) {
        campaigns.push({
          id: String(c._id),
          name: c.name,
          clientId: String(c.clientId),
          clientName: clientMap.get(String(c.clientId)) ?? '',
        });
      }
    }
  }

  const total = clients.length + campaigns.length;
  if (total === 0) {
    return { clients: [], campaigns: [], message: `No clients or campaigns found matching "${query}".` };
  }

  return { clients, campaigns };
}
