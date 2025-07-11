// main.js

// margins + inner dimensions
const margin = { top: 20, right: 20, bottom: 50, left: 60 };
const width  = 800 - margin.left - margin.right;
const height = 600 - margin.top  - margin.bottom;

// select the SVG and add a <g> for margins
const rootSvg = d3.select('#scatterplot');
const svg     = rootSvg
  .append('g')
  .attr('transform', `translate(${margin.left},${margin.top})`);

let data;
const axisOptions = {
  'IMDb Rating':            'imdbRating',
  'Tomatometer':            'Meter',
  'Number of Reviews':      'Reviews',
  'Box Office (million $)': 'BoxOffice',
  'Length (minutes)':       'Runtime',
  'Year':                   'Year'
};

d3.csv('movies_cleaned.csv', d3.autoType).then(rows => {
  data = rows;
  setupControls();
  updatePlot();
});

function setupControls() {
  Object.keys(axisOptions).forEach(key => {
    d3.select('#xAxis').append('option').text(key).attr('value', key);
    d3.select('#yAxis').append('option').text(key).attr('value', key);
  });
  d3.select('#xAxis').property('value', 'Tomatometer');
  d3.select('#yAxis').property('value', 'IMDb Rating');

  const genres = Array.from(new Set(
    data
      .filter(d => typeof d.Genre === 'string')
      .flatMap(d => d.Genre.split(',').map(s => s.trim()))
  )).sort();

  const genreSel = d3.select('#genre');
  genreSel.append('option').text('All').attr('value', 'All');
  genres.forEach(g => genreSel.append('option').text(g).attr('value', g));

  d3.selectAll('input, select').on('input', updatePlot);
}

function updatePlot() {
  // 1. read controls
  const xKey     = axisOptions[d3.select('#xAxis').property('value')];
  const yKey     = axisOptions[d3.select('#yAxis').property('value')];
  const genre    = d3.select('#genre').property('value');
  const director = d3.select('#director').property('value').toLowerCase();
  const cast     = d3.select('#cast').property('value').toLowerCase();
  const reviews  = +d3.select('#reviews').property('value');
  const oscars   = +d3.select('#oscars').property('value');
  const minYear  = +d3.select('#minYear').property('value');
  const maxYear  = +d3.select('#maxYear').property('value');
  const boxoffice= +d3.select('#boxoffice').property('value');

  d3.select('#reviewVal').text(reviews);
  d3.select('#oscarVal').text(oscars);

  // 2. filter data
  const filtered = data.filter(d =>
    d.Reviews   >= reviews   &&
    d.Oscars    >= oscars    &&
    d.BoxOffice >= boxoffice &&
    d.Year      >= minYear   &&
    d.Year      <= maxYear   &&
    (genre === 'All' || (typeof d.Genre==='string' && d.Genre.includes(genre))) &&
    d.Director.toLowerCase().includes(director) &&
    d.Cast.toLowerCase().includes(cast)
  );

  // 3. update movie count
  d3.select('#movieCount').text(`${filtered.length} movies selected`);

  // 4. scales
  const x = d3.scaleLinear()
    .domain(d3.extent(filtered, d=>d[xKey])).nice()
    .range([0, width]);
  const y = d3.scaleLinear()
    .domain(d3.extent(filtered, d=>d[yKey])).nice()
    .range([height, 0]);

  // 5. clear previous
  svg.selectAll('*').remove();

  // 6. draw axes
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x));
  svg.append('g')
    .call(d3.axisLeft(y));

  // 7. axis labels
  svg.append('text')
    .attr('x', width/2).attr('y', height+40)
    .style('text-anchor','middle')
    .text(xKey);
  svg.append('text')
    .attr('transform','rotate(-90)')
    .attr('x', -height/2).attr('y', -45)
    .style('text-anchor','middle')
    .text(yKey);

  // 8. draw circles
  svg.selectAll('circle.data-circle')
    .data(filtered)
    .join('circle')
      .attr('class', 'data-circle')
      .attr('cx', d=>x(d[xKey]))
      .attr('cy', d=>y(d[yKey]))
      .attr('r', 5)
      .attr('fill', d=>d.color)
      .attr('fill-opacity', filtered.length>50?0.3:0.4);

  // 9. attach hover to #viz via elementsFromPoint
  const viz = document.getElementById('viz');
  viz.onmousemove  = createHoverHandler(filtered);
  viz.onmouseleave = () => d3.select('#tooltip').style('display','none');
}

function createHoverHandler(filtered) {
  return function(event) {
    const elems = document.elementsFromPoint(event.clientX, event.clientY);
    const hits = elems
      .filter(el => el.tagName === 'circle' && el.classList.contains('data-circle'))
      .map(el => d3.select(el).datum());

    if (!hits.length) {
      return d3.select('#tooltip').style('display','none');
    }

    // wrap each movie in its own paragraph for spacing
    const html = hits
      .map(d => `<p><strong>${d.Title}</strong> (${d.Year})</p>`)
      .join('');

    d3.select('#tooltip')
      .style('display','block')
      .html(html)
      .style('left', `${event.pageX + 10}px`)
      .style('top',  `${event.pageY + 10}px`);
  };
}
