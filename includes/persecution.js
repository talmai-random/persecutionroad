/*
* Global variables
*/
var initialTiming = 290;
var map = null;
var layers = {};
var selectedMarker = 1;
var allMarkers = [];
var routeLoading = 0;
var hijackResponse = false;
var deathPerSecond = 163000.0/365.0/24.0/60.0/60.0;
var deathSinceLogin = 0.0;
var animatedMarkerTimer = null;
var fadeOutValue = 0.4;
var popup = null;
var previousZoom = 4;
var panImageTimer = null;
var religionGraph = null;
var LOAD_ROUTES = true;
var USE_LOCAL_ROUTE_GEOMETRY = true;
var CLOUDMADE_USER_DEV_API = "*********************";
var currentCountry = null;
var currentPrayerRequest = null;
var maxPrayerRequest = null;
var minPrayerRequest = null;
var colors = ["#008c00", "#4096ee", "#ff7400", "#b02b2c", "#3f4c6b", "#c79810", "#ff0084", "#ffd700"]

/*
* Utility functions
*/
function toLatLng(latLngString){
	return new L.LatLng(parseFloat(latLngString.split(",")[0]), parseFloat(latLngString.split(",")[1]));
}

function addScript(url) {
	setTimeout(function(){
		var script = document.createElement('script');
		script.type="text/javascript";
		script.src=url;
		document.getElementsByTagName('head') [0].appendChild(script);
	}, Math.floor(Math.random() * 1000) + initialTiming);
	initialTiming += 100;
}

function getRouteRed(response){
	response.color = '#b43831';
	getRoute(response);
}

function getRouteBlue(response){
	response.color = 'blue';
	getRoute(response);
}

function getRouteGreen(response){
	response.color = 'green';
	getRoute(response);
}

function getRoute(response) {
	if (response.status != 0) return;
	routeLoading--;
	if (typeof response.color === "undefined") response.color = '#b43831';
	var point, route, points = [];
	for (var i=0; i<response.route_geometry.length; i++) {
		point = new L.LatLng(response.route_geometry[i][0] , response.route_geometry[i][1]);
		points.push(point);
	}
	if (hijackResponse) {
		hijackResponse = false;
		moveMarker(-1, points);
	}
	route= new L.Polyline(points, {
		weight: 4,
		opacity: 0.6,
		smoothFactor: 1.0,
		color: response.color,
		clickable: false
	});

	layers.routes.addLayer(route);
	layers.routes.addTo(map);

	if (routeLoading == 0){
		showInstructions(selectedMarker); //changeDay(selectedMarker);
//		moveMarker(selectedMarker+1);
	}
}

function loadData(){
	addScript('includes/dataPoints.js');
}

function getSelectedMarker(){
	for (i = 0; i < allMarkers.length; i++){
		var marker_ = allMarkers[i];
		if (marker_.type === "large") return marker_.marker;
	}
}

function getMarkerByPos(selectedMarkerGeo){
	for (i = 0; i < allMarkers.length; i++){
		var marker_ = allMarkers[i];
		if (marker_.marker.getLatLng().equals(selectedMarkerGeo) && marker_.type != "large") return marker_;
	}
}

function animateLargeMarker(){
	for (i = 0; i < allMarkers.length; i++){
		var marker_ = allMarkers[i];
		if (marker_.type === "large"){
			for (j = 0; j < allMarkers.length; j++){
				if (allMarkers[j].type === "small" && allMarkers[j].day === marker_.day) allMarkers[j].marker.setOpacity(0);
			}

			marker_.marker.bounceOpts({duration: 500, height: 20, onEnd: function(){
				for (j = 0; j < allMarkers.length; j++){
					if (allMarkers[j].type === "small" && allMarkers[j].day === this.day) allMarkers[j].marker.setOpacity(1.0);
				}
				animatedMarkerTimer = setTimeout(animateSelectedMarker, 1000);
			}});
		}
	}
}

function moveMarker(pos, points){
	if (typeof points === "undefined"){
		for (var i = 0; i < persecutionCities.length; i++){
			if (typeof persecutionCities[i].day != "undefined" && persecutionCities[i].day == pos){
				hijackResponse = true;
				var script = document.createElement('script');
				script.type="text/javascript";
				script.src='includes/routes/' + persecutionCities[i].geo + ',' + persecutionCities[i - 1].geo + '/' + persecutionCities[i].route + 	'9760.json';
				document.getElementsByTagName('head') [0].appendChild(script);
				return;
			}
		}
	}
	else {
		getSelectedMarker().moveTo(points);
	}
}

function arrivedAtDestination(){
	selectedMarker++;
	for (var i = 0; i < persecutionCities.length; i++){
		if (typeof persecutionCities[i].day != "undefined" && persecutionCities[i].day == selectedMarker){
			this.setLatLng(persecutionCities[i+1].geo);
		}
	}
}

function changeDay(toDay){
	if (routeLoading !=  0 || $("#map").css('display') == "none") return;
	for (var i = 0; i < persecutionCities.length; i++){
		if (typeof persecutionCities[i].day != "undefined" && persecutionCities[i].day == toDay){
			clearTimeout(animatedMarkerTimer);
			getSelectedMarker().setLatLng(toLatLng(persecutionCities[i].geo)).setZIndexOffset(4);
			//$("#day").css('background-image', 'url("images/prayer_day_'+selectedMarker+'.png")');
			//$("#prev").css('background-image', 'url("images/previous_day'+((selectedMarker==1)?'_off':'')+'.png")');
			$("#prev_bar").fadeTo('fast', ((selectedMarker==1)?fadeOutValue:1.0));
			//$("#next").css('background-image', 'url("images/next_day'+((selectedMarker==totalNumberDays)?'_off':'')+'.png")');
			$("#next_bar").fadeTo('fast', ((selectedMarker==totalNumberDays)?fadeOutValue:1.0));
			map.panTo(toLatLng(persecutionCities[i].geo));
			popup = L.popup({maxWidth: 600, offset: new L.Point(2,-6), autoPanPadding: new L.Point(50,200)})
				.setLatLng(toLatLng(persecutionCities[i].geo))
				.setContent("<table><tr><td><b>Location:</b> " + persecutionCities[i].name + "</td><td align=right><img src=\"images/prayer_day_" + persecutionCities[i].day + ".png\"></td></tr><tr><td colspan=2>" + lookupCountryDescription(persecutionCities[i].name) + "</td></tr><tr><td colspan=2 align=right><a style='text-decoration:underline; cursor: pointer;' onclick='showPrayerDayInfo(" + i + ", \"" + persecutionCities[i].name + "\");'>Read more...</a></td></tr></table>")
				.openOn(map);
			selectedMarker = toDay;
			return;
		}
	}
}

function showInstructions(toDay){
	if (routeLoading !=  0 || $("#map").css('display') == "none") return;
	for (var i = 0; i < persecutionCities.length; i++){
		if (typeof persecutionCities[i].day != "undefined" && persecutionCities[i].day == toDay){
			map.panTo(toLatLng(persecutionCities[i].geo));
			$(".tutorial").colorbox({rel:'tutorial'});
			setTimeout(function (){
				$('#start_tutorial').trigger('click');
 			}, 500);
		}
	}
}

function otherInterfaceAdjustments(){
	// hijack back button
	bajb_backdetect.OnBack = function(){
		window.location = 'index.html';
	};

	$(".detailedViewBackButton").click(hidePrayerDayInfo);
	/*
	--> breaks when dealing with mobile CSS adjustments...
	$("#logo").hover(
		function() {
			$(this).css('cursor','pointer');
		}, null
	).click(hidePrayerDayInfo);
	*/

	// adjust prev/next bar positioning
	var newY = (parseInt($("#footer").offset().top) - 150)/2;
	//alert($("#footer").css("top") + " -- " + parseInt($("#footer").css("top")));
	if (newY > 0){
		$("#prev_bar").css("top", 100+newY);
		$("#next_bar").css("top", 100+newY);
	}

	//fadeTo('fast', fadeOutValue).
	$("#prev_bar").hover(
		function() {
			//$(this).fadeTo('slow', 1.0);
			if (selectedMarker==1) $(this).css('cursor','auto');
			else $(this).css('cursor','pointer');
		},
		function(){
			//$(this).fadeTo('slow', fadeOutValue);
		}
	).click(
		function() {
			//$(this).fadeTo('fast', fadeOutValue);
			if (selectedMarker==1) return;
			changeDay(--selectedMarker);
	});
	/*
	$("#prev").hover(
		function() {
			if (selectedMarker==1) $(this).css('cursor','auto');
			else $(this).css('cursor','pointer');
		}, null
	).click(
		function() {
			if (selectedMarker==1) return;
			changeDay(--selectedMarker);
	});
	*/
	$("#prev_pray").hover(
		function() {
			$(this).css('cursor','pointer');
		}, null
	).click(
		function() {
			previousPrayerRequest();
	});

	//fadeTo('fast', fadeOutValue).
	$("#next_bar").hover(
		function() {
			//$(this).fadeTo('slow', 1.0);
			if (selectedMarker==totalNumberDays) $(this).css('cursor','auto');
			else $(this).css('cursor','pointer');
		},
		function(){
			//$(this).fadeTo('slow', fadeOutValue);
		}
	).click(
		function() {
			//$(this).fadeTo('fast', fadeOutValue);
			if (selectedMarker==totalNumberDays) return;
			changeDay(++selectedMarker);
	});
	/*
	$("#next").hover(
		function() {
			if (selectedMarker==totalNumberDays) $(this).css('cursor','auto');
			else $(this).css('cursor','pointer');
		}, null
	).click(
		function() {
			if (selectedMarker==totalNumberDays) return;
			changeDay(++selectedMarker);
	});
	*/
	$("#next_pray").hover(
		function() {
			$(this).css('cursor','pointer');
		}, null
	).click(
		function() {
			nextPrayerRequest();
	});

	if (typeof getSelectedMarker() === "undefined") {
		map.panTo(toLatLng(persecutionCities[0].geo));
	}
	else changeDay(selectedMarker);

	$("#partner").hover(
		function() {
			$(this).css('cursor','pointer');
			//$(this).css('background-image','url("images/partner.png")');
		},
		function() {
			//$(this).css('cursor','auto');
			//$(this).css('background-image','url("images/partner_off.png")');
		}
	).click(function(){
		window.location = 'http://www.releaseinternational.org';
	});
}

function showPrayerDayInfo(idx, name){
	currentCountry = name.split(",")[1].replace(/^\s+|\s+$/g, '');

	// set detailed view up...
	map.closePopup();
	$("#header").css('top', '-148px');
	$("#map").css('width', '30%');
	$("#logo").css('background-image', "url('images/logo_detailed_view.png')").css('width','112').css('height','28').css('top','0').css('left','10');
	$("#partner").css('background-image', "url('images/partner_off.png')").css('right','15').css('width','91').css('height','20').css('bottom','8');
	$("#footer_top_border").css('height','37');
	$("#footer").css('height','152');
	$(".detailedViewBackButton").css('visibility', 'visible').css('padding-right', parseInt($("#content").css('width'))/2).css('padding-left', parseInt($("#content").css('width'))/2).show();

	// hide irrelevant markers, and show only those for this country
	map.removeLayer(layers.cities);
	map.removeLayer(layers.routes);
	layers.country[currentCountry].addTo(map);

	// zoom to bounds
	map.invalidateSize();
	previousZoom = map.getZoom();
	map.fitBounds(layers.country[currentCountry].getBounds());
	if (map.getZoom() > 4) map.setZoom(4);

	// remove UI elements not needed
	$("#site_description").hide();
	$("#next_bar").hide();
	$("#prev_bar").hide();
	$("#content").show();
	$("#next_pray").show();
	$("#prev_pray").show();

	$("#content_description").css('height', parseInt($("#footer").offset().top - $("#content_description").offset().top));

	// adjust and populate images
	$("#content_image").css('background-image', "url('images/" + currentCountry + "_1.jpg')").css('clip','rect(0px, ' + $("#content").css('width') + ', ' + $("#content_image").css('height') + ', 0px)');
	clearTimeout(panImageTimer);
	var limit = 400;
	var direction = -1;
	var showTimes = 0;
	panImageTimer = setInterval(function() {
		$('#content_image').css('background-position','0 ' + limit + 'px') ;
		limit = limit + direction;
		if((limit < parseInt($("#content_image").css('height').split("px")[0]) + 10) || limit > 400) {
			direction = -1*direction;
			showTimes++;
			if (showTimes == 2) $("#content_image").css('background-image', "url('images/" + currentCountry + "_2.jpg')");
			if (showTimes == 4) $("#content_image").css('background-image', "url('images/" + currentCountry + "_3.jpg')");
			if (showTimes == 6) $("#content_image").css('background-image', "url('images/" + currentCountry + "_4.jpg')");
			if (showTimes == 8) {
				showTimes = 0;
				$("#content_image").css('background-image', "url('images/" + currentCountry + "_1.jpg')");
			}
		}
	},50);

	// populate rest data
	var oCountry = lookupCountry(name);
	$("#full_name").html("("+oCountry.fullName+")");
	$("#description").html(oCountry.fullDescription);
	$("#capital").html(oCountry.capital);
	$("#population").html(oCountry.population);
	$("#government").html(oCountry.government);
	$("#sources").html(oCountry.sources);

	if (religionGraph != null) religionGraph.clear();

	religionGraph =
		Raphael("graph"),
		fin = function () {
			this.flag = religionGraph.popup(this.bar.x, this.bar.y, this.bar.value || "0").insertBefore(this);
		},
		fout = function () {
			this.flag.animate({opacity: 0}, 300, function () {this.remove();});
		},
		fin2 = function () {
			var y = [], res = [];
			for (var i = this.bars.length; i--;) {
				y.push(this.bars[i].y);
				res.push(this.bars[i].value || "0");
			}
			this.flag = religionGraph.popup(this.bars[0].x, Math.min.apply(Math, y), res.join(", ")).insertBefore(this);
		},
		fout2 = function () {
			this.flag.animate({opacity: 0}, 300, function () {this.remove();});
		},
		txtattr = { font: "12px sans-serif" };

	var barChart = religionGraph.barchart(0, 20, 110, 145, [oCountry.values]).hover(fin, fout);

	for (var i=0; i< barChart.bars[0].length; i++) {
		barChart.bars[0][i].attr({fill: colors[i]});
		var bar = barChart.bars[0][i];
		var label_x = bar.x
		var label_y = 80;
		var label_text = oCountry.labels[i];
		var label_attr = { fill:  "#000000", font: "10px sans-serif", transform: "r-90"};
		religionGraph.text(label_x, label_y, label_text).attr(label_attr);
	}
	/*
	religionGraph = Raphael('graph', 150, 150);
	religionGraph.pieChart(75, 65, 60, oCountry.values, oCountry.labels, null, "#fff");
	*/

	maxPrayerRequest = 0,
	minPrayerRequest = persecutionCities.length;
	for (var i = 0; i < persecutionCities.length; i++){
		if (typeof persecutionCities[i].day != "undefined") {
			var thisCountry = persecutionCities[i].name.split(",")[1].replace(/^\s+|\s+$/g, '');
			if (thisCountry == currentCountry){
				maxPrayerRequest = (i > maxPrayerRequest)?i:maxPrayerRequest;
				minPrayerRequest = (i < minPrayerRequest)?i:minPrayerRequest;
			}
		}
	}
	updatePrayerRequest(idx);
}

function animateSelectedMarker(layer){
	setTimeout(function(){ clearTimeout(animatedMarkerTimer);}, 100);
	clearTimeout(animatedMarkerTimer);
	layer.bounceOpts({duration: 500, height: 20, onEnd: function(){
		var _layer = this;
		clearTimeout(animatedMarkerTimer);
		animatedMarkerTimer = setTimeout(function(){
			animateSelectedMarker(_layer);}, 1000);
	}});
}

function previousPrayerRequest(){
	--currentPrayerRequest;
	if (currentPrayerRequest < minPrayerRequest) currentPrayerRequest = maxPrayerRequest;
	var thisCountry = persecutionCities[currentPrayerRequest].name.split(",")[1].replace(/^\s+|\s+$/g, '');
	while (thisCountry != currentCountry) {
		--currentPrayerRequest;
		thisCountry = persecutionCities[currentPrayerRequest].name.split(",")[1].replace(/^\s+|\s+$/g, '');
	}
	updatePrayerRequest(currentPrayerRequest);
}

function nextPrayerRequest(){
	++currentPrayerRequest;
	if (currentPrayerRequest > maxPrayerRequest) currentPrayerRequest = minPrayerRequest;
	var thisCountry = persecutionCities[currentPrayerRequest].name.split(",")[1].replace(/^\s+|\s+$/g, '');
	while (thisCountry != currentCountry) {
		++currentPrayerRequest;
		thisCountry = persecutionCities[currentPrayerRequest].name.split(",")[1].replace(/^\s+|\s+$/g, '');
	}
	updatePrayerRequest(currentPrayerRequest);
}

function updatePrayerRequest(marker){
	if (typeof marker == "number") currentPrayerRequest = marker;
	var idx = (typeof marker == "number")?marker:marker.options.vectorIdx;
	$("#pray").html(persecutionCities[idx].prayerRequest);
	$("#name").html(persecutionCities[idx].name);
	// animate current point
	layers.country[currentCountry].eachLayer(function (layer) {
		if (layer.getLatLng().equals(toLatLng(persecutionCities[idx].geo))) animateSelectedMarker(layer);
	});
	if (!$.browser.msie){
		setTimeout(function(){
			$(".content_"+currentCountry+"_"+persecutionCities[idx].day).colorbox({rel:'content_'+currentCountry+"_"+persecutionCities[idx].day});
		}, 300);
	}
	else {
		$(".content_"+currentCountry).click(function(){
			window.open($(".content_"+currentCountry+"_"+persecutionCities[idx].day).prop('href'), '_blank');
			return false;
		});
	}
}

function hidePrayerDayInfo(){
	// pretty much undo everything "showPrayerDayInfo()" did...
	setTimeout(function(){ clearTimeout(animatedMarkerTimer);}, 100);
	clearTimeout(animatedMarkerTimer);
	$("#next_pray").hide();
	$("#prev_pray").hide();
	$("#content").hide();
	$("#content_image").empty();
	$("#next_bar").show();
	$("#prev_bar").show();
	$("#header").css('top', '-78px');
	$(".detailedViewBackButton").css('visibility', 'hidden').hide();
	$("#footer").css('height','178');
	$("#footer_top_border").css('height','63');
	$("#partner").css('background-image', "url('images/partner.png')").css('right','45').css('width','228').css('height','50').css('bottom','8');
	$("#logo").css('background-image', "url('images/logo.png')").css('width','362').css('height','90').css('top','3').css('left','30');
	$("#site_description").show();
	$("#map").css('width', '100%');
	map.removeLayer(layers.country[currentCountry]);
	layers.routes.addTo(map);
	layers.cities.addTo(map);
	map.invalidateSize();
	map.setZoom(previousZoom);
	map.fitBounds(layers.cities.getBounds());
	changeDay(selectedMarker);
}

function initCounter(){
	/*
	* Counter init
	*/
	/*
	setTimeout(function(){
		function updateDeathCounter(){
			deathSinceLogin += deathPerSecond;
			console.log(deathSinceLogin);
			setTimeout(updateDeathCounter, 1000);
		}
		updateDeathCounter();
	}, 1000);
	*/
}

function initMap(){
	//initCounter();

	/*
	* Map Initialization
	*/
	var unlabeled_smallMarker = L.icon({
		iconUrl: 'images/marker-icon_small.png', //dot-marker-icon.png',
		iconAnchor: [7, 20]
		//iconAnchor: [3, 4]
	});

	var SweetIcon = L.Icon.Label.extend({
		options: {
			iconUrl: 'images/marker-icon_small.png',
			shadowUrl: null,
			iconSize: new L.Point(17, 28),
			iconAnchor: [-4, 7],
			labelAnchor: new L.Point(10, 0),
			wrapperAnchor: new L.Point(12, 13),
			labelClassName: 'sweet-deal-label'
		}
	});

	var smallMarkerHighlighted = L.icon({
		iconUrl: 'images/marker-icon_small_2.png',
		iconAnchor: [7, 20]
	});

	var largeMarker = L.icon({
		iconUrl: 'images/marker-icon_large.png',
		iconAnchor: [23, 45]
	});

	map = L.map('map', {
		center: [38.083333,62.066667],
		zoom: 4,
		zoomControl: false,
		inertia: false,
		attributionControl: false
	});

	L.tileLayer('http://{s}.tile.cloudmade.com/' + CLOUDMADE_USER_DEV_API + '/1/256/{z}/{x}/{y}.png', {
		maxZoom: 6,
		detectRetina: true,
	}).addTo(map);

	otherInterfaceAdjustments();

	layers.cities = L.featureGroup();
	layers.routes = L.featureGroup();
	layers.country = {};
	var lastCountry = null;
	for (var i = 0; i < persecutionCities.length; i++){
		if (typeof persecutionCities[i].day != "undefined") {
			// create all markers
			var smallMarker = null;
			if (jQuery.browser.msie) smallMarker = unlabeled_smallMarker;
			else smallMarker = new SweetIcon({ labelText: persecutionCities[i].day });
			var marker_ = {day: persecutionCities[i].day, type: 'small', marker: L.marker(toLatLng(persecutionCities[i].geo), {icon: smallMarker}).on('click', function(e){changeDay(getMarkerByPos(e.target.getLatLng()).day);})};
			lastCountry = persecutionCities[i].name.split(",")[1].replace(/^\s+|\s+$/g, '');
			if (typeof layers.country[lastCountry] === "undefined") {
				// new country
				layers.country[lastCountry] = L.featureGroup();
			}
			allMarkers.push(marker_);
			layers.cities.addLayer(marker_.marker);
			layers.country[lastCountry].addLayer(new L.marker(toLatLng(persecutionCities[i].geo), {icon: smallMarker, vectorIdx: i}).on('click', function(e){updatePrayerRequest(e.target);}));

			// create selected day marker
			if (persecutionCities[i].day == selectedMarker){
				marker_ = {type: 'large', marker: L.marker(toLatLng(persecutionCities[i].geo), {icon: smallMarkerHighlighted}).on('click', function(e){changeDay(getMarkerByPos(e.target.getLatLng()).day);})};
				allMarkers.push(marker_);
				//marker: L.animatedMarker([toLatLng(persecutionCities[i].geo)], {icon: smallMarkerHighlighted, onEnd: arrivedAtDestination})
				layers.cities.addLayer(marker_.marker);
			}
			if (i > 0 && LOAD_ROUTES) {
				if (typeof persecutionCities[i].route === "undefined"){
					addScript('http://routes.cloudmade.com/' + CLOUDMADE_USER_DEV_API + '/api/0.3/' + persecutionCities[i].geo + ',' + persecutionCities[i - 1].geo + '/car.js?callback=getRouteRed');
					routeLoading++;
				}
				else {
					routeLoading++;
					if (persecutionCities[i].route === 'direct'){
						var response = {};
						response.status = 0;
						response.route_geometry = [];
						response.route_geometry.push(persecutionCities[i].geo.split(","));
						response.route_geometry.push(persecutionCities[i - 1].geo.split(","));
						getRoute(response);
					}
					else {
						if (!USE_LOCAL_ROUTE_GEOMETRY)
							addScript('http://routes.cloudmade.com/' + CLOUDMADE_USER_DEV_API + '/api/0.3/' + persecutionCities[i].geo + ',' + persecutionCities[i - 1].geo + '/' + persecutionCities[i].route + 	'.js?callback=getRouteRed');
						else {
							addScript('includes/routes/' + persecutionCities[i].geo + ',' + persecutionCities[i - 1].geo + '/' + persecutionCities[i].route + 	'9760.json');
						}
					}
				}
			}
		}
	}
	layers.cities.addTo(map);

	var popup = L.popup();

	// for all other resolutions, load simple layout
	var currDay = 1;
	while (currDay != totalNumberDays + 1){
		for (var i = 0; i < persecutionCities.length; i++){
			if (typeof persecutionCities[i].day != "undefined" && persecutionCities[i].day == currDay){
				var oCountry = lookupCountry(persecutionCities[i].name);
				$("#simple_content").append(
				"<table><tr><td><img src=\"images/prayer_day_" + persecutionCities[i].day + ".png\"></td><td align=right><b>Location:</b> " + persecutionCities[i].name + "</td></tr>"+
				"<tr><td colspan=2>" + persecutionCities[i].prayerRequest + "</td></tr></table><br><hr><br>");
				currDay++;
				break;
			}
		}
	}
}

// bind documentReady to the ready() event in jQuery
$(document).ready(loadData);
