document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
	e.preventDefault();

	const newPassword = document.getElementById('newPassword').value;
	const confirmPassword = document.getElementById('confirmPassword').value;

	if (newPassword !== confirmPassword) {
		showToast('Passwords do not match');
		return;
	}

	try {
		const urlParams = new URLSearchParams(window.location.search);
		const token = urlParams.get('token');

		const response = await fetch('/api/auth/reset-password', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token, newPassword })
		});

		const data = await response.json();

		if (response.ok) {
			showToast('Password reset successful', false);
			document.querySelectorAll('input[type="password"]').forEach(function (input) {
				input.value = "";
			});
			setTimeout(() => window.location.href = '/', 2000);
		} else showToast(data.error);
	} catch (error) {
		showToast('Network error occurred');
	}
});

function showToast(message, error = true) {
	const toast = document.createElement('div');
	toast.className = `toast ${error ? 'error' : ''}`;
	toast.textContent = message;
	document.body.appendChild(toast);
	setTimeout(() => toast.remove(), 5000);
}