import { z } from 'zod';

import { publicProcedure, protectedProcedure, router } from '../trpc';
import prisma from '../../db/prisma';

export const libraryRouter = router({
	category: publicProcedure
		.input(
			z.object({
				uri: z.string(),
			})
		)
		.query(async ({ input }) => {
			const data = await prisma.category.findUnique({
				where: {
					uri: input.uri,
				},
				include: {
					categoryChildren: true,
					resourceChildren: true,
					parent: true,
				},
			});

			if (!data) {
				return null;
			}

			return data;
		}),
	comment: protectedProcedure
		.input(
			z.object({
				uri: z.string(),
				content: z.string(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const target = await prisma.resource.findUnique({
				where: {
					uri: input.uri,
				},
			});

			if (!target) {
				throw new Error('Invalid target document URI for commenting');
			}

			await prisma.resourceComment.create({
				data: {
					content: input.content,
					author: {
						connect: { id: ctx.session.user.id },
					},
					parent: {
						connect: { uri: target.uri },
					},
					timestamp: Date(),
				},
			});
		}),
	meta: publicProcedure.query(async () => {
		const numResourcesQuery = prisma.resource.count();
		const numCategoriesQuery = prisma.category.count();
		const [numResources, numCategories] = await Promise.all([
			numResourcesQuery,
			numCategoriesQuery,
		]);

		return {
			numResources,
			numCategories,
		};
	}),
	allCategories: publicProcedure.query(async () => {
		const categoriesQuery = await prisma.category.findMany();

		return categoriesQuery;
	}),
	rootCategories: publicProcedure.query(async () => {
		const categoriesQuery = await prisma.category.findMany({
			where: {
				parentId: null,
			},
		});

		return categoriesQuery;
	}),
	allResources: publicProcedure.query(async () => {
		const resourcesQuery = await prisma.resource.findMany();

		return resourcesQuery;
	}),
	getFullCategoryPath: publicProcedure
		.input(
			z.object({
				uri: z.string(),
			})
		)
		.query(async ({ input }) => {
			let currentCategory = await prisma.category.findUnique({
				where: {
					uri: input.uri,
				},
			});

			if (currentCategory === null)
				throw new Error(`Category URI ${input.uri} does not exist`);

			const path = [currentCategory.uri];

			while (currentCategory.parentId) {
				currentCategory = await prisma.category.findUnique({
					where: {
						uri: currentCategory.parentId,
					},
				});

				if (!currentCategory)
					throw new Error(`Category URI ${input.uri} does not exist`);

				path.push(currentCategory.uri);
			}

			return path.reverse();
		}),
	resource: publicProcedure
		.input(
			z.object({
				uri: z.string(),
			})
		)
		.query(async ({ input }) => {
			const data = await prisma.resource.findUnique({
				where: {
					uri: input.uri,
				},
			});

			return data;
		}),
	isCategory: publicProcedure
		.input(
			z.object({
				uri: z.string(),
			})
		)
		.query(async ({ input }) => {
			const categoryUri = await prisma.category.findUnique({
				where: {
					uri: input.uri,
				},
				select: {
					uri: true,
				},
			});

			return categoryUri !== null;
		}),
	resourceComments: publicProcedure
		.input(
			z.object({
				uri: z.string(),
			})
		)
		.query(async ({ input }) => {
			let data = await prisma.resource.findUnique({
				where: {
					uri: input.uri,
				},
				include: {
					comments: {
						include: {
							author: true,
						},
					},
				},
			});

			if (!data) {
				throw new Error(`Resource URI ${input.uri} does not exist`);
			}

			data = computeISOTimestamp(data);
			data.comments = data.comments.map((comment) =>
				computeISOTimestamp(comment)
			);

			data.comments.reverse();

			return data.comments;
		}),
});

type DateTimestamp = {
	timestamp: Date;
};

type WithISOTimestamp<T> = T & {
	timestamp: string;
};

function computeISOTimestamp<Resource extends DateTimestamp>(
	resource: Resource
): WithISOTimestamp<Resource> {
	return {
		...resource,
		timestamp: resource.timestamp.toISOString(),
	};
}