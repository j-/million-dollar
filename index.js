var path = require('path');
var url = require('url');
var dns = require('dns');
var Promise = require('bluebird');

var data = require('./data.json');

// decorate with domain hostname
data.forEach(function (record) {
	var urlStr = record.href;
	var parsed = url.parse(urlStr);
	if (parsed && parsed.hostname) {
		var hostname = parsed.hostname.toLowerCase();
		hostname = hostname.replace(/^\.?(www\.)?/, '');
		record.hostname = hostname;
	}
});

// decorate with availability
var promises = data.map(function (record) {
	var hostname = record.hostname;
	if (!hostname) {
		record.available = null;
		return Promise.resolve(record);
	}
	return new Promise(function (resolve, reject) {
		dns.resolve4(hostname, function (err) {
			record.available = Boolean(err);
			resolve(record);
		});
	});
});

// decorate with dimensions
data.forEach(function (record) {
	var coords = record.coords.split(',').map(Number);
	var width = coords[2] - coords[0];
	var height = coords[3] - coords[1];
	var area = width * height;
	record.coords = coords;
	record.width = width;
	record.height = height;
	record.area = area;
});

Promise.all(promises).then(function (records) {
	return records.filter(function (record) {
		return record.available;
	}).sort(function (left, right) {
		var areaSort = right.area - left.area;
		if (areaSort !== 0) {
			return areaSort;
		}
		if (right.hostname > left.hostname) {
			return 1;
		}
		else if (right.hostname < left.hostname) {
			return -1;
		}
		return 0;
	});
}).then(function (records) {
	var str = JSON.stringify(records, null, '\t');
	process.stdout.write(str);
});
