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
		const messageElement = document.getElementById('verificationMessage');

		if (response.ok) {
			showToast('Email verified successfully!', false);
			messageElement.innerHTML += `
                <button class="primary-button" onclick="window.location.href='/'">
                    Go to Login
                </button>
            `;
		} else {
			showToast(data.error);
			messageElement.innerHTML += `
                <button class="primary-button" onclick="window.location.href='/'">
                    Return to Login
                </button>
            `;
		}
	} catch (error) {
		showToast('Verification failed. Please try again.');
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