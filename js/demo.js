if (this.value == 'text' || this.value == 'gpx') {
    $('homepage_submit').value = 'Convert it';
} else if (this.value == 'profile') {
    $('homepage_submit').value = 'Draw it';
} else {
    $('homepage_submit').value = 'Map it';
}