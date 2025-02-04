async function verifyEmail() {
	try {
		const urlParams = new URLSearchParams(window.location.search);
		const token = urlParams.get('token');

		if (!token) {
			showToast('Invalid verification link');
			return;
		}

		const response = await fetch('/api/auth/verify-email', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token })
		});

		const data = await response.json();

		if (response.ok) showToast('Email verified successfully!', false);
		else showToast(data.error);
		setTimeout(() => window.location.href = '/', 2000);
	} catch (error) {
		console.log(error)
		showToast('Verification failed. Please try again.');
		setTimeout(() => window.location.href = '/', 2000);
	}
}

document.addEventListener('DOMContentLoaded', verifyEmail);

function showToast(message, error = true) {
	const toast = document.createElement('div');
	toast.className = `toast ${error ? 'error' : ''}`;
	toast.textContent = message;
	document.body.appendChild(toast);
	setTimeout(() => toast.remove(), 5000);
}

function goBack() {
	window.location.href = "https://ai.nasiadka.pl";
}