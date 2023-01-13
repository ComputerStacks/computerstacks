import Image from 'next/image';
import { ChangeEvent } from 'react';
import { GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { createProxySSGHelpers } from '@trpc/react-query/ssg';
import superjson from 'superjson';

import Loading from '../../components/loading';
import Share from '../../components/share';
import { appRouter } from '../../server/routers/_app';
import { intoLevels } from '../../util/intoLevels';
import { trpc } from '../../util/trpc';

import Comment from '../../components/comment';
import Button from '../../components/button';

import notroadmap from '../../public/notfavorite.svg';
import profile from '../../public/profile.png';
import roadmap from '../../public/favorite.svg';
import shareIcon from '../../public/share.png';

function Roadmap() {
	const router = useRouter();
	const { data: session, status } = useSession();

	const uri =
		typeof router.query.roadmap !== 'string' ? '' : router.query.roadmap;

	const roadmapsQuery = trpc.roadmaps.roadmap.useQuery({ uri });
	const commentMutation = trpc.roadmaps.comment.useMutation();
	const roadmapMutation = trpc.user.roadmap.useMutation();

	const [isRoadmap, setIsRoadmap] = useState(false);
	const [comment, setComment] = useState('');
	const [comments, setComments] = useState(roadmapsQuery?.data?.comments);
	const [isShare, setIsShare] = useState(false);

	useEffect(() => {
		if (status !== 'authenticated') return;

		if (!router.query.roadmap || typeof router.query.roadmap === 'object') {
			throw new Error(`Invalid roadmap URI ${router.query.roadmap}`);
		}

		if (session.user.roadmaps.includes(router.query.roadmap))
			setIsRoadmap(true);
	}, [session?.user.roadmaps, status, router.query.roadmap]);

	useEffect(() => {
		setComments(roadmapsQuery?.data?.comments);
	}, [roadmapsQuery?.data?.comments]);

	if (router.isFallback) return <Loading />;

	function handleRoadmap() {
		if (status !== 'authenticated') {
			alert('You must be logged in to add a roadmap');
			return;
		}

		if (isRoadmap) {
			roadmapMutation.mutateAsync({ uri }).then(() => {
				setIsRoadmap(false);
			});
		} else {
			roadmapMutation.mutateAsync({ uri }).then(() => {
				setIsRoadmap(true);
			});
		}
	}

	function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
		const target = event.target;
		const value = target.value;
		const name = target.name;

		if (name === 'comment') setComment(value);
	}

	function handleComment() {
		if (status !== 'authenticated') {
			alert('You must be logged in to comment');
			return;
		}

		commentMutation
			.mutateAsync({
				uri:
					typeof router.query.roadmap !== 'string' ? '' : router.query.roadmap,
				content: comment,
			})
			.then(reloadComments);

		setComment('');
	}

	async function reloadComments() {
		await roadmapsQuery.refetch();

		setComments(roadmapsQuery?.data?.comments);
	}

	function listComments() {
		if (!comments) return null;
		return comments.map((comment) => (
			<Comment key={comment.id} data={comment} />
		));
	}

	function handleShare() {
		if (isShare) {
			setIsShare(false);
		} else {
			setIsShare(true);
		}
	}

	return (
		<main>
			<section className="bg-head-3">
				<h2 className="text-5xl">{roadmapsQuery.data?.name}</h2>
				<p className="text-3xl">{roadmapsQuery.data?.description}</p>
				<div className="flex flex-row items-center justify-center">
					<div className="relative">
						<Image
							onClick={handleShare}
							src={shareIcon}
							alt="Share Icon"
							width={50}
							height={50}
							className="h-auto max-w-full"
						/>
						{isShare ? (
							<Share
								name={roadmapsQuery.data?.name ?? ''}
								toggle={handleShare}
							/>
						) : null}
					</div>
					<Image
						onClick={handleRoadmap}
						src={isRoadmap ? roadmap : notroadmap}
						alt="Favorite button"
						width={75}
						height={75}
						className="h-auto max-w-full"
					/>
				</div>
			</section>
			<section className="bg-gray-1">
				<Image
					src={roadmapsQuery.data?.image ?? ''}
					width={1000}
					height={1000}
					alt="The roadmap"
					className="h-auto max-w-full"
				/>
			</section>
			<section className="bg-gray-2">
				<h2 className="m-2 text-4xl">Comments</h2>
				<div className="w-1/2">
					<div className="relative flex w-full flex-row items-center justify-start rounded-md bg-gray-4 p-3">
						<Image
							src={session?.user?.image || profile}
							width={40}
							height={40}
							alt="Profile picture"
							className="h-auto max-w-full rounded-full bg-gray-400"
						/>
						<textarea
							className="m-2 h-16 w-full resize-none rounded-md p-3 text-black"
							name="comment"
							value={comment}
							onChange={handleChange}
						/>
						<Button onClick={handleComment}>Comment</Button>
					</div>
					<div className="flex w-full flex-col items-center justify-center">
						{listComments()}
					</div>
				</div>
			</section>
		</main>
	);
}

async function getStaticPaths() {
	const res = {
		paths: new Array<{ params: { roadmap: string } }>(),
		fallback: true,
	};

	const caller = appRouter.createCaller({ session: null });

	const data = await caller.roadmaps.meta();

	if (!data) return res;

	const levels = intoLevels(data.roadmaps);

	for (const level of levels) {
		for (const roadmap of level)
			res.paths.push({ params: { roadmap: roadmap.uri } });
	}

	return res;
}

const getStaticProps: GetStaticProps = async ({ params }) => {
	if (!params) {
		throw Error('Category page parameters not found');
	}

	if (!params.roadmap || typeof params.roadmap === 'object') {
		throw Error(`Invalid roadmap URI ${params.roadmap}`);
	}

	const ssg = await createProxySSGHelpers({
		router: appRouter,
		ctx: {
			session: null,
		},
		transformer: superjson,
	});

	await ssg.roadmaps.roadmap.prefetch({ uri: params.roadmap });

	return {
		revalidate: 86400,
		props: {
			trpcState: ssg.dehydrate(),
		},
	};
};

export { getStaticPaths, getStaticProps };

export default Roadmap;
