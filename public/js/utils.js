function setCookie(name, value, hours = 1) {
	const expires = new Date(Date.now() + (1000 * 60 * 60 * hours)).toUTCString();
	document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
}

function getCookie(name) {
	return document.cookie.split('; ').reduce((r, v) => {
		const parts = v.split('=');
		return parts[0] === name ? decodeURIComponent(parts[1]) : r;
	}, '');
}

function deleteCookie(name) {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
}

function createElement(tag, classNames = [], textContent = '', attributes = {}) {
	const element = document.createElement(tag);
	classNames.forEach(className => element.classList.add(className));
	Object.keys(attributes).forEach(attr => element.setAttribute(attr, attributes[attr]));
	element.textContent = textContent;
	return element;
}