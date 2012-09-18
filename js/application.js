var limit = 100;
var globalURL = "http://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=b25b959554ed76058ac220b7b2e0a026&format=json&limit=" + limit;
var userURL = "http://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&api_key=b25b959554ed76058ac220b7b2e0a026&format=json&limit=" + limit + "&user="
var artistURL = "http://ws.audioscrobbler.com/2.0/?method=artist.getinfo&api_key=b25b959554ed76058ac220b7b2e0a026&format=json&mbid=";

var artists = [];
var genres = [];

var quantifier = "listeners"

var processedArtists = 0;

var totalSize = 0;

var width = 900,
    height = width,
    radius = width / 2,
    x = d3.scale.linear().range([0, 2 * Math.PI]),
    y = d3.scale.pow().exponent(1.3).domain([0, 1]).range([0, radius]),
    padding = 5,
    duration = 1000;
    
var div = d3.select("#visualisation");

div.append("p")
    .text("Click to zoom");

var vis = div.append("svg")
    .attr("width", width + padding * 2)
    .attr("height", height + padding * 2)
    .append("g")
    .attr("transform", "translate(" + [radius + padding, radius + padding] + ")");

var partition = d3.layout.partition()
    .sort(null)
    .value(function(d) { return 5.8 - d.depth; });

var arc = d3.svg.arc()
    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
    .innerRadius(function(d) { return Math.max(0, d.y ? y(d.y) : d.y); })
    .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });

function Track(id, name, playcount, listeners, duration){
	var _id = id;
	var _name = name;
	var _playcount = parseInt(playcount);
	var _listeners = parseInt(listeners);
	var _duration = parseInt(duration);
	var _colour = randomColour();
	
	this.getID = function(){
		return _id;
	}
	
	this.getName = function(){
		return _name.replace(new RegExp('"', "g"), '');
	}
	
	this.getPlayCount = function(){
		return _playcount;
	}
	
	this.getListeners = function(){
		return _listeners;
	}
	
	this.getDuration = function(){
		return _duration;
	}
	
	this.getSize = function(){
		return _playcount;
	}
	
	this.getColour = function(){
		return _colour;
	}
	
	this.parentColour = function(pColour){
		_colour = deriveColour(pColour, this.getSize())
	}
}

function Artist(id, name){
	var _id = id;
	var _name = name;
	var _colour = randomColour();
	var _tracks = [];
	var _size = undefined;
	
	this.getID = function(){
		return _id;
	}
	
	this.getName = function(){
		return _name;
	}
	
	this.addTrack = function(track){
		_tracks.push(track);
	}
	
	this.getTracks = function(){
		return _tracks;
	}

	this.getColour = function(){
		return _colour;
	}
	
	this.getSize = function(){
		if(_size == undefined){
			var _size = _tracks.reduce(function(previousValue, currentValue){
				return previousValue + currentValue.getSize();
			},0);
		}
		return _size;
	}
	
	this.parentColour = function(pColour){
		_colour = deriveColour(pColour, this.getSize());
		$.each(_tracks, function(key, track){
			track.parentColour(_colour);
		});
	}
}

function Genre(name){
	var _name = name;
	var _colour = randomColour();
	
	var _artists = [];
	
	this.addArtist = function(artist){
		artist.parentColour(_colour);
		_artists.push(artist);
	}
	
	this.getArtists = function(){
		return _artists;
	}
	
	this.getName = function(){
		return _name;
	}
	
	this.getColour = function(){
		return _colour;
	}
	
	this.getSize = function(){
		if(_size == undefined){
			var _size = _artists.reduce(function(previousValue, currentValue){
				return previousValue + currentValue.getSize();
			},0);
		}
		return _size;
	}
	
	this.calculateColour = function(){
		_colour = randomColour(this.getSize());
		$.each(_artists, function(key, artist){
			artist.parentColour(_colour);
		});
	}
}

function GetArtist(id){
	for(var i  = 0; i < artists.length; i++){
		if(id == artists[i].getID()){
			return artists[i];
		}
	}
	
	return undefined;
}

function GetGenre(name){
	for(var i  = 0; i < genres.length; i++){
		if(name == genres[i].getName()){
			return genres[i];
		}
	}
	
	return undefined;
}

function BuildJSON(){
	var jsonString = "["
	for(var genreIndex = 0; genreIndex < genres.length; genreIndex++){
		jsonString += '{"name":"' + genres[genreIndex].getName() + '","colour":"' + genres[genreIndex].getColour() + '","children":[';
		
		var _artists = genres[genreIndex].getArtists();
		
		for(var artistIndex = 0; artistIndex < _artists.length; artistIndex++){
			jsonString += '{"name":"' + _artists[artistIndex].getName() + '","colour":"' + _artists[artistIndex].getColour() + '","children":[';
			
			var _tracks = _artists[artistIndex].getTracks();
			
			for(var trackIndex = 0; trackIndex < _tracks.length; trackIndex++){
				jsonString += '{"name":"' + _tracks[trackIndex].getName() + '","colour":"' + _tracks[trackIndex].getColour() + '","size":' + _tracks[trackIndex].getSize() + '}';
				
				if(trackIndex < _tracks.length - 1){
					jsonString += ",";
				}
			}
			
			jsonString += "]}";
			if(artistIndex < _artists.length - 1){
				jsonString += ",";
			}
		}
		
		jsonString += "]}";
		if(genreIndex < genres.length - 1){
			jsonString += ",";
		}
	}
	jsonString += "]";
	
	console.log(jsonString);
	
	return jsonString;
}

function processGraph(){
	totalSize = genres.reduce(function(previousValue, currentValue){
					return previousValue + currentValue.getSize();
				},0);

	for(var i = 0; i < genres.length; i++){
		genres[i].calculateColour();
		console.log(genres[i].getName() + " " + genres[i].getSize() + " [" + genres[i].getSize() / totalSize * 100 + "%]");
	}

	var json = JSON.parse(BuildJSON());
	
	var nodes = partition.nodes({children: json});

	var path = vis.selectAll("path").data(nodes);
	path.enter().append("path")
		.attr("id", function(d, i) { return "path-" + i; })
		.attr("d", arc)
		.attr("fill-rule", "evenodd")
		.style("fill", colour)
		.on("click", click);

	var text = vis.selectAll("text").data(nodes);
	var textEnter = text.enter().append("text")
		.style("fill-opacity", 1)
		.style("fill", function(d) {
			return brightness(d3.rgb(colour(d))) < 125 ? "#eee" : "#000";
		})
		.attr("text-anchor", function(d) {
			return x(d.x + d.dx / 2) > Math.PI ? "end" : "start";
		})
		.attr("dy", ".2em")
		.attr("transform", function(d) {
			var multiline = (d.name || "").split(" ").length > 1,
			angle = x(d.x + d.dx / 2) * 180 / Math.PI - 90,
			rotate = angle + (multiline ? -.5 : 0);
			return "rotate(" + rotate + ")translate(" + (y(d.y) + padding) + ")rotate(" + (angle > 90 ? -180 : 0) + ")";
		})
		.on("click", click);
		
	textEnter.append("tspan")
		.attr("x", 0)
		.text(function(d) { return d.depth ? d.name : ""; })
		.style("visibility", 	function(d)	{
												var _name = d.name;
												if(_name != undefined){
													return (d.dx * 100 / limit < 0.02 || _name.length * 12 > radius / 3) ? "hidden" : null;
												}else
													return "hidden";
											});

	function click(d) {
		path.transition()
		.duration(duration)
		.attrTween("d", arcTween(d));
		
		text.style("visibility", function(e) {
			return isParentOf(d, e) ? null : d3.select(this).style("visibility");
		})
		.transition()
		.duration(duration)
		.attrTween("text-anchor", function(d) {
			return function() {
				return x(d.x + d.dx / 2) > Math.PI ? "end" : "start";
			};
		})
		.attrTween("transform", function(d) {
			var multiline = (d.name || "").split(" ").length > 1;
			return function() {
				var angle = x(d.x + d.dx / 2) * 180 / Math.PI - 90,
				rotate = angle + (multiline ? -.5 : 0);
				return "rotate(" + rotate + ")translate(" + (y(d.y) + padding) + ")rotate(" + (angle > 90 ? -180 : 0) + ")";
			};
		})
		.style("fill-opacity", function(e) { return isParentOf(d, e) ? 1 : 1e-6; })
		.each("end", function(e) {
			var _this = d3.select(this);
			var _isParent = isParentOf(d, e);
			if(_isParent){
				var _text = d3.select(this.children[0]);
				_text.style("visibility", (!_isParent || e.dx * ((d.depth + 1)) * 100 / limit < 0.02 || (e.name != undefined && e.name.length * 12 > radius / (3 - d.depth))) ? "hidden" : null);
			}
			_this.style("visibility", _isParent ? null : "hidden");
		});
	}
}

function isParentOf(p, c){
  if (p === c) return true;
  if (p.children){
    return p.children.some(function(d){
      return isParentOf(d, c);
    });
  }
  return false;
}

function colour(d){
	if (d.children){
		var	colours = d.children.map(colour),
			a = d3.hsl(colours[0]),
			b = d3.hsl(colours[1]);
		return d.colour || d3.hsl((a.h + b.h) / 2, a.s * 1.2, a.l / 1.2);
	}
	return d.colour || "#ffffff"; 
}

function arcTween(d){
	var	my = maxY(d),
		xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
		yd = d3.interpolate(y.domain(), [d.y, my]),
		yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
		return function(d) {
			return function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); return arc(d); };
		};
}

function maxY(d){
	return d.children ? Math.max.apply(Math, d.children.map(maxY)) : d.y + d.dy;
}

// http://www.w3.org/WAI/ER/WD-AERT/#color-contrast
function brightness(rgb) {
	  return rgb.r * .299 + rgb.g * .587 + rgb.b * .114;
}

function randomColour(value){
	if(value != undefined){
		return d3.hsl(Math.floor(Math.random()*360), .2 + (.4 - .2) * (value / totalSize), .2 + (.7 - .2) * (1 - (value / totalSize))).toString()
	}
    return d3.hsl(Math.floor(Math.random()*360), .2 + (.4 - .2) * Math.random(), .3 + (.7 - .3) * Math.random()).toString();
}

function deriveColour(baseColour, value){
	baseHSL = d3.hsl(baseColour);
	var _l = baseHSL.l + .05 * (1 - (value * processedArtists  / totalSize));
	if(_l > .8)
		_l = .8;
	if(_l < .2)
		_l = .2;
	return d3.hsl(baseHSL.h + Math.floor(Math.random() * 50) - 25, baseHSL.s + .4 * (value * processedArtists  / totalSize) , _l);
}

function processArtists(){
	processedArtists = 0
	$.each(artists, function(key, artist){
		$.getJSON(
			artistURL + artist.getID(),
			function(data){
				if(data.error == undefined){
					var _genre = GetGenre(data.artist.tags.tag[0].name);
					
					if(_genre == undefined){
						_genre = new Genre(data.artist.tags.tag[0].name);
						genres.push(_genre);
					}
					
					_genre.addArtist(artist);
					
					processedArtists++;
				}else{
					processedArtists++;
				}
				if(processedArtists >= artists.length){
						processGraph();
				}
			}
		);
	});
}

function getGlobal(){
	$.getJSON(
		globalURL,
		function(data){
			$.each(data.tracks.track, function(key, track){
				var _track = new Track(track.mbid, track.name, track.playcount, track.listeners, track.duration);
				
				var _artist = GetArtist(track.artist.mbid);
				
				if(_artist == undefined){
					_artist = new Artist(track.artist.mbid, track.artist.name);
					artists.push(_artist);
				}
				
				_artist.addTrack(_track);
			});
			
			processArtists();
		}
	);
}

function getUser(username){
	$.getJSON(
		userURL + username,
		function(data){
			$.each(data.toptracks.track, function(key, track){
				var _track = new Track(track.mbid, track.name, track.playcount, track.listeners, track.duration);
				
				var _artist = GetArtist(track.artist.mbid);
				
				if(_artist == undefined){
					_artist = new Artist(track.artist.mbid, track.artist.name);
					artists.push(_artist);
				}
				
				_artist.addTrack(_track);
			});
			
			processArtists();
		}
	);
}

function clearGraph(){
	$("g").empty();
	artists = [];
	genres = [];
}

$(document).ready(function (){
	getGlobal();
	
	$("#btnUserLookup").click(function(){
		clearGraph();
		getUser($("#username").val());
		return false;
	});
	
	$("#btnReset").click(function(){
		clearGraph();
		getGlobal();
		return false;
	});
});