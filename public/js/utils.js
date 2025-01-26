// ToDo: Move more code here

function setCookie(name, value, hours) {
	const expires = new Date(Date.now() + (1000 * 60 * 60 * hours)).toUTCString();
	document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
}

function getCookie(name) {
	return document.cookie.split('; ').reduce((r, v) => {
		const parts = v.split('=');
		return parts[0] === name ? decodeURIComponent(parts[1]) : r;
	}, '');
}