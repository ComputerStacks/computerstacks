import Image from 'next/image';
import Link from 'next/link';
import axios from 'axios';
import styles from '../styles/Home.module.css';
import Background from '../public/tech.png';
import Icons from '../public/icons.png';
import prettyMs from 'pretty-ms';

function Home(props) {
	function listEvents() {
		const events = props.data?.events.filter((event) => {
			const eventDate = new Date(event.date).getTime();
			const now = Date.now();
			return now >= eventDate && now <= eventDate + event.duration;
		});

		if (!events || events?.length === 0)
			return (
				<div>
					<p>No upcoming events right now... Check back later!</p>
				</div>
			);

		return events.map((event) => (
			<div key={event.name} className={styles.eventCard}>
				<h3>{event.name}</h3>
				<p>{prettyMs(event.duration, { verbose: true })}</p>
				<div>
					<p>{event.description}</p>
				</div>
			</div>
		));
	}

	return (
		<main>
			<section className="top">
				<Image
					priority={true}
					src={Background}
					alt="background"
					layout="fill"
					objectFit="fill"
				/>
				<Image src={Icons} alt="Computer Icons" className={styles.icons} />
				<p className={styles.blurb}>
					Lorem ipsum dolor sit amet, consectetur adipiscing elit
				</p>
			</section>
			<section className="section1" id="main-desc">
				<h2>The world&apos;s largest collection of computer resources</h2>
				<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit...</p>
				<button className="button">
					<Link href="/library">
						<a className="link">Browse now</a>
					</Link>
				</button>
			</section>
			<section className="section2" id="events">
				<h2>Events</h2>
				{listEvents()}
				<p>
					<Link href="/events">
						<a className="link">View the entire event calendar</a>
					</Link>
				</p>
			</section>
			<section className="section3" id="cards">
				<div className={styles.card}>
					<p>Lorem ipsum dolor sit amet, consectetur</p>
				</div>
				{/* Card Carousel? */}
			</section>
		</main>
	);
}

export async function getStaticProps() {
	const EVENTS_META_URL = `/api/events/fetch`;

	let res = { revalidate: 60, props: { data: {}, error: false } };

	let data = await axios.get(EVENTS_META_URL);
	data = data.data;
	if (!data) res.props.error = true;
	else res.props.data = data;

	return res;
}

export default Home;
