window.addEventListener('load', () => {
	const topBar = document.getElementsByClassName('top-bar')[0];
	const button = document.getElementById('verify-button');
	button.addEventListener('click', () => {
		// here I should use ipc in order to resize the view from the index.js (setBounds)
		// topBar.classList.remove("hidden");
	});
});
