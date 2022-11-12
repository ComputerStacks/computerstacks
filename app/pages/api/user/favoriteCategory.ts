import { withSentry } from "@sentry/nextjs";
import { getSession } from 'next-auth/react';

import prisma from '../../../db/prisma';

import type { NextApiRequest, NextApiResponse } from 'next';

async function favoriteCategory(req: NextApiRequest, res: NextApiResponse) {
	const session = await getSession({ req });

	if (!session) return res.status(401).end();

	if (session.user.favorites.includes(req.body.uri)) {
		await prisma.user.update({
			where: {
				id: session.user.id
			},
			data: {
				favoriteCategories: {
					disconnect: { uri: req.body.uri }
				}
			}
		});
	} else {
		await prisma.user.update({
			where: {
				id: session.user.id
			},
			data: {
				favoriteCategories: {
					connect: { uri: req.body.uri }
				}
			}
		});
	}

	return res.status(200).end();
}

export default withSentry(favoriteCategory);
