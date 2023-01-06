import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { signOut } from 'next-auth/react';

import { trpc } from '../util/trpc';

import HeadStyles from '../styles/Head.module.css';
import SettingsStyles from '../styles/Settings.module.css';

function Settings() {
	const [modal, setModal] = useState(false);
	const [runExport, setRunExport] = useState(false);
	const router = useRouter();

	const exportQuery = trpc.data.export.useQuery(undefined, {
		enabled: runExport,
	});

	const deleteMutation = trpc.data.delete.useMutation();

	useEffect(() => {
		if (exportQuery.data && runExport) {
			alert(`Your data is: ${JSON.stringify(exportQuery.data)}`);
			setRunExport(false);
		}
	}, [exportQuery.data, runExport]);

	async function handleDataExport() {
		setRunExport(true);
	}

	async function handleDataDelete() {
		await deleteMutation.mutateAsync();

		await signOut({ redirect: false });

		router.push('/login');
	}

	function handleModal() {
		setModal(!modal);
	}

	return (
		<main>
			<section className={HeadStyles.head}>
				<h2>Settings</h2>
			</section>
			<section className="section2">
				<h2>Data</h2>
				<button className="button-small" onClick={handleDataExport}>
					Export Data
				</button>
				<br />
				<button className="button-small" onClick={handleModal}>
					Delete Data
				</button>
			</section>
			<div
				className={SettingsStyles.modal}
				style={{ display: modal ? 'flex' : 'none' }}
			>
				<p>
					Are you sure you want to delete all of your data?{' '}
					<strong>This is irreversible!</strong>
				</p>
				<div>
					<button className="button-small" onClick={handleDataDelete}>
						Yes, DELETE my data.
					</button>
					<button className="button-small" onClick={handleModal}>
						No, save my data!
					</button>
				</div>
			</div>
		</main>
	);
}

export default Settings;
