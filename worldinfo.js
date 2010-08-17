/*
  World Info by Christian Heilmann
  Homepage: http://github.com/codepo8/worldinfo
  Copyright (c)2010 Christian Heilmann
  Code licensed under the BSD License:
  http://wait-till-i.com/license.txt
*/
$(document).ready(function(){

  // define messages and "global variables"
  var loading = 'Please wait, loading the world&hellip; '+
                '(can take up to 20 seconds - only on the first start)',
      contentloading = 'Loading content&hellip;',
      current,cs;
  // if localStorage is supported and the browser has the world 
  // data cached, use this instead of hammering YQL
  if(localStorage && localStorage.getItem('thewholefrigginworld')){
    render(JSON.parse(localStorage.getItem('thewholefrigginworld')));
  } else {

    // Otherwise display a loading message
    $('#list').html('<p class="load">'+loading+'</p>');
    
    // This YQL query loads all the children of the element with the 
    // Where on Earth ID 1 (which is earth) and sorts them by name
    // for more info check the geoplanet API
    // http://developer.yahoo.com/geo/geoplanet/
    var query = 'select centroid,woeid,name,boundingBox'+
                ' from geo.places.children(0)'+
                ' where parent_woeid=1 and placetype="country"'+
                ' | sort(field="name")';
    var YQL = 'http://query.yahooapis.com/v1/public/yql?q='+
               encodeURIComponent(query)+'&diagnostics=false&format=json';
 
    // load the information and store it if the browser supports it - then
    // render the interface 
    $.getJSON(YQL,function(data){
      if(localStorage){
        localStorage.setItem('thewholefrigginworld',JSON.stringify(data));
      }
      render(data);
    });

  }

  // render the information 
  
  function render(data) {
  
    // start a list
    var aznav = '<ul>';
    var out = '<div id="azlists">';

    // loop over all the places in the data
    cs = data.query.results.place;
    var old = '';
    for(var i=0,j=cs.length;i<j;i++){

      // if the first character of the current name is different
      // than the last one add a new item and a nested list 
      // this generates the A-Z navigation and the items
      var now = cs[i].name.substr(0,1);
      if(now !== old){
        aznav+= '<li><button value="'+i+'">'+now+'</button></li>';
        out+='<ul id="list'+now+'">';
      }
      // add the name of the location and use a number as the value
      out += '<li><button value="'+i+'">'+cs[i].name+'</button></li>';
      if(i<j-1 && now !== cs[i+1].name.substr(0,1)){
        out+='</ul>';
      }
      old = now;
    }
    aznav+='</ul>';
    out+='</div>';

    // add a container to host the map and content and show the results
    $('#list').hide().html(
      aznav+out+'<div id="container"></div>').
      fadeIn('slow');

    // load the content for the first country and display it
    showcountry($('#listA button:first'));

    // add the class show to the first sub-menu to show it
    current = $('#listA');
    current.addClass('show');
    
    // Use event delegation (now that jQuery has caught up) on all 
    // links inside the #list element 
    $("#list").delegate("button","click",function(event){
      event.preventDefault();
  
      // if the content of the button is a single character we are in the A-Z 
      // navigation and we shift the "show" class from the last shown 
      // sub-menu to the current one
      if($(this).html().length==1){
        $(current).removeClass('show').hide();
        current = $('#list'+$(this).html());
        current.hide().addClass('show').show('medium');
        $('#list'+$(this).html()+' button:first').focus();
        
      // otherwise we call the showcountry function 
      } else {
        showcountry($(this));
      }  

    });
  };
  // load country information from Wikipedia and display a map
  function showcountry(elm){

    // fade the old container and show a loading message
    $('#container').fadeOut().html(
      '<p class="load">'+contentloading+'</p>'
      ).fadeIn();

    // Get the name of the country the user clicked on and replace 
    // spaces with an underscore - this is the WikiPerdia convention
    var name = elm.html().replace(/ /g,'_'); 

    // get the information about the country from the data stored from 
    // geoplanet - this is why I used numbers as the href 
    var bb = cs[elm.attr('value')];

    var width = $('#main').width()-$('#azlists ul:first').width()-50;

    // Use the awesome static maps API for open street map at 
    // http://pafciu17.dev.openstreetmap.org to show the map using 
    // the bounding box data from geoplanet
    var image = 'http://pafciu17.dev.openstreetmap.org/?module=map&bbox='+
                 bb.boundingBox.southWest.longitude+','+
                 bb.boundingBox.northEast.latitude+','+
                 bb.boundingBox.northEast.longitude+','+
                 bb.boundingBox.southWest.latitude+
                '&points='+bb.centroid.longitude+','+bb.centroid.latitude+
                ',pointImagePattern:greenI&width='+width+'&height=250';

    // Add a heading and the image
    var out = '<h2>'+bb.name+'</h2><div class="img"><img src="'+image+
              '" alt="'+bb.name+'"></div>';

    // Scrape country content from WikiPedia. Each country web site 
    // has a table with short info of the country - get the three following 
    // paragraphs
    query = 'select * from html where url="http://en.wikipedia.org/wiki/'+
             name+'" and xpath="//table/following-sibling::p" limit 3';
    YQL = 'http://query.yahooapis.com/v1/public/yql?q='+
           encodeURIComponent(query)+'&diagnostics=false&'+
          'format=xml&callback=?';

    // Load the data and join the results. Then replace all the /wiki links 
    // with working links. If there was no data returned, delete what 
    // was coming back from the API (the JSON wrapper)
    $.getJSON(YQL,function(data){
      if(data.results){
        data = data.results.join('').replace(/"\/wiki/g,
        '"http://en.wikipedia.org/wiki');
      } else {
        data = '';
      }
      
      // hide the container, populate and show it
      $('#container').hide().html(out+data).fadeIn();
  
      // remove all the <sup> elements (Wikipedia footnote links)
      $('#container sup').remove();
    });
  }
});

// and I'm spent! 