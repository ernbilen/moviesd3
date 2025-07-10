const margin = { top: 20, right: 20, bottom: 50, left: 60 };
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

const svg = d3.select("#scatterplot")
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

let data;
const axisOptions = {
  "IMDb Rating": "imdbRating",
  "Tomatometer": "Meter",
  "Number of Reviews": "Reviews",
  "Box Office (million dollars)": "BoxOffice",
  "Length (minutes)": "Runtime",
  "Year": "Year"
};

d3.csv("movies_cleaned.csv", d3.autoType).then(movies => {
  data = movies;
  setupControls();
  updatePlot();
});

function setupControls() {
  const keys = Object.keys(axisOptions);
  keys.forEach(k => {
    d3.select("#xAxis").append("option").text(k).attr("value", k);
    d3.select("#yAxis").append("option").text(k).attr("value", k);
  });
  d3.select("#xAxis").property("value", "Tomatometer");
  d3.select("#yAxis").property("value", "IMDb Rating");

  const genres = Array.from(new Set(
    data
      .filter(d => typeof d.Genre === "string")
      .flatMap(d => d.Genre.split(",").map(g => g.trim()))
  )).sort();

  d3.select("#genre").append("option").text("All").attr("value", "All");
  genres.forEach(g => {
    d3.select("#genre").append("option").text(g).attr("value", g);
  });

  d3.selectAll("input, select").on("input", updatePlot);
}

function updatePlot() {
  // 1. Read controls
  const xKey = axisOptions[d3.select("#xAxis").property("value")];
  const yKey = axisOptions[d3.select("#yAxis").property("value")];
  const genre = d3.select("#genre").property("value");
  const director = d3.select("#director").property("value").toLowerCase();
  const cast = d3.select("#cast").property("value").toLowerCase();
  const reviews = +d3.select("#reviews").property("value");
  const oscars = +d3.select("#oscars").property("value");
  const minYear = +d3.select("#minYear").property("value");
  const maxYear = +d3.select("#maxYear").property("value");
  const boxoffice = +d3.select("#boxoffice").property("value");

  d3.select("#reviewVal").text(reviews);
  d3.select("#oscarVal").text(oscars);

  // 2. Now define `filtered` before using it
  const filtered = data.filter(d =>
    d.Reviews >= reviews &&
    d.Oscars >= oscars &&
    d.BoxOffice >= boxoffice &&
    d.Year >= minYear &&
    d.Year <= maxYear &&
    (genre === "All" || (typeof d.Genre === "string" && d.Genre.includes(genre))) &&
    d.Director.toLowerCase().includes(director) &&
    d.Cast.toLowerCase().includes(cast)
  );

  // ✅ Safe to use filtered now
  // Recreate or move the movieCount label above the plot
  d3.select("#movieCount")
    .style("position", "relative")
    .style("text-align", "center")
    .style("font-weight", "bold")
    .style("margin-bottom", "10px")
    .text(`${filtered.length} movies selected`);


  const x = d3.scaleLinear()
    .domain(d3.extent(filtered, d => d[xKey])).nice()
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain(d3.extent(filtered, d => d[yKey])).nice()
    .range([height, 0]);

  svg.selectAll("*").remove();

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .call(d3.axisLeft(y));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .style("text-anchor", "middle")
    .text(xKey);

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .style("text-anchor", "middle")
    .text(yKey);

  svg.selectAll("circle")
    .data(filtered)
    .join("circle")
    .attr("cx", d => x(d[xKey]))
    .attr("cy", d => y(d[yKey]))
    .attr("r", 5)
    .attr("fill", d => d.color)
    .attr("fill-opacity", d => {
      const baseAlpha = filtered.length > 50 ? 0.3 : 0.4;
      if (d.color === "orange" || d.color === "purple") {
        return baseAlpha + 0.2; // slightly stronger visibility
      }
      return baseAlpha;
    })


  // Add single mousemove listener to the SVG
  svg.on("mousemove", function (event) {
    const [mx, my] = d3.pointer(event);
    const radius = 5;

    const overlapping = filtered.filter(d => {
      const cx = x(d[xKey]);
      const cy = y(d[yKey]);
      const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
      return dist <= radius + 2;
    });

    if (overlapping.length > 0) {
      const html = overlapping.map(d =>
        `<strong>${d.Title}</strong> (${d.Year})<br>$${d.revenue}`
      ).join("<br><br>");

      d3.select("#tooltip")
        .style("display", "block")
        .html(html)
        .style("left", `${event.pageX - 50}px`)
        .style("top", `${event.pageY - 170}px`);
    } else {
      d3.select("#tooltip").style("display", "none");
    }
  });

  svg.on("mouseout", () => {
    d3.select("#tooltip").style("display", "none");
  });



}
