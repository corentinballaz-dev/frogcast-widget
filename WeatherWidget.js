class WeatherWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.mainColor = "#033C40";
    this.latitude = null;
    this.longitude = null;
    this.baseApi = "https://api.frogcast.com/api/v1";
    this.weatherData = {
      t2m: null,
      rh2m: null,
      windSpeed: null,
      windDirection: null,
      tcc: null,
      mtpa: null,
      ghi: null,
      mtpr: null,
      mtsr: null,
      storm_idx: null,
      windGust: null
    };
    this.selectedDayIndex = 0;
    this.dayAmount = 5;
    this.widgetToken = null;
    this.forecastHorizon = false;
    this.useFahrenheit = false;
    this.useMph = false;
    this.use24h = false;
    this.useInches = false;
  }

  /**
   * 
   */
  connectedCallback() {
    // this.initSettings();    
    this.render();
    this.setupEvents();
    this.loadForecast();
  }

  /**
   * Sets the names of the observed attributes in the widget's html
   */
  static get observedAttributes() {
    return ["main-color", "day-amount", "widget-token", "temp-unit", "wind-unit", "time-format", "precip-unit"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case "main-color":
        this.mainColor = newValue || "#033C40";
        if (this.shadowRoot) this.applyTheme();
        break;
      case "widget-token" : 
        this.widgetToken = newValue;
        console.log (this.widgetToken);
        break;
      case "day-amount":
        this.forecastHorizon = newValue === "3";
        if (this.forecastHorizon) {
          this.dayAmount = 3;
          console.log(this.dayAmount);
        }
        break;
      case "temp-unit":
        this.useFahrenheit = newValue === "f";
        break;
      case "wind-unit":
        this.useMph = newValue === "mph";
        break;
      case "time-format":
        this.use24h = newValue === "24h";
        break;
      case "precip-unit":
        this.useInches = newValue === "in";
        break;
    }
  }

  /**
   * Applies the custom color
   */
  applyTheme() {
    this.style.setProperty("--main-color", this.mainColor);
  }

  /**
   * HTML CSS of the widget, hidden icons 
   */
  render() {

    this.shadowRoot.innerHTML = `
  <style>
    :host {
      display: block;
      font-family: Arial, sans-serif;
      background: transparent;
    }

    .widget {
      width: 100%;
      max-width: 560px;
      padding: 16px;
      padding-top: 0;
      border: 1px solid #ddd;
      border-radius: 14px;
      background: var(--main-color, #033C40);
      box-sizing: border-box;
      color: #fff;
    }

    .brand-name {
      align-self: flex-end;
      display: inline-flex;
      width: fit-content;
    }

    .brand-name a {
      display: block;
    }

    .top-row {
      display: flex;
      align-items: top;
      gap: 2em;
      padding: 0;
    }

    .brand-logo {
      width: 10em;
      height: auto;
      display: block;
      object-fit: contain;
    }

    .weather-text {
      display: flex;
      flex-direction: column;
      padding-top: 1em;
    }

    #location {
      margin: 0 0 6px 0;
      font-weight: bold;
      font-size: 1.2em; 
    }

    .current {
      display: flex;
      flex-direction: column;
      margin-top: 8px;
      text-align: left;
    }

    .temperature-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    #temperature {
      margin: 0;
      font-size: 64px;
      line-height: 0.9;
      font-weight: 700;
      color: #fff;
    }

    .weather-details {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
    }

    #current-weather,
    #apparent-temperature {
      margin: 0;
      color: #fff;
    }

    #current-weather {
      font-size: 18px;
      font-weight: 600;
    }

    #apparent-temperature {
      font-size: 14px;
      opacity: 0.85;
    }
    .additional-weather {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 10px;
      margin-top: 10px;
      flex-wrap: wrap;
    }

    .current-precipitation,
    .current-wind {
      display: flex;
      align-items: center;
      justify-content: center;
      padding-right: 1em;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
    }

    .current-precipitation p,
    .current-wind p {
      margin: 0;
    }
    .info h2 {
      margin: 0 0 6px;
      font-size: 20px;
      color: #fff;
    }

    .info p {
      margin: 0 0 12px;
      color: rgba(255, 255, 255, 0.8);
    }

    .main-condition {
      display: flex;
      gap: 16px;
      margin: 18px 0;
      padding: 14px 0;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
      color: #fff;
    }

    .main-condition > div {
      flex: 1;
    }

    .main-condition p {
      margin: 0;
    }

    .main-condition [id^="label-"] {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.75);
      margin-bottom: 6px;
    }

    .main-condition [id="humidity"],
    .main-condition [id="cloudCover"],
    .main-condition [id="windSpeed"] {
      font-size: 18px;
      font-weight: 600;
      color: #fff;
    }

    .branding {
      margin: 14px 0;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
    }

    .forecast {
      margin-top: 18px;
    }

    .forecast__days {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
      gap: 12px;
    }

    .forecast__day {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 12px; 
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.06);
      text-align: center;
      transition: all 0.2s ease;
    }
    
    .forecast__icon {
      width: 6em; 
      height: 6em;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding:0;
    }

    .forecast__temp-group {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .forecast__temp-group--horizontal {
      flex-direction: row;
      gap: 8px;
      margin-bottom: 12px;
    }

    .forecast__temp-group--vertical {
      flex-direction: column;
      gap: 2px;
    }

    .forecast__temp-max {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: #fff;
    }

    .forecast__temp-min {
      margin: 0;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.6);
    }

    .forecast__extra {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 8px;
    }

    .forecast__extra-item {
      margin: 0;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.8);
      display: flex;
      justify-content: space-between;
    }

    .forecast__extra-label {
      color: rgba(255, 255, 255, 0.4);
      font-weight: 500;
    }

    .hourly {
      margin-top: 18px;
    }

    .hourly__title {
      margin: 0 0 12px;
      font-size: 14px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.85);
    }

    .hourly__list {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding-bottom: 6px;
      scrollbar-width: thin;
      scroll-snap-type: x proximity;
    }

    .hourly__item {
      flex: 0 0 75px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 12px 10px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.06);
      scroll-snap-align: start;
    }

    .hourly__time {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.75);
      margin: 0;
    }

    .hourly__icon {
      width: 70px;
      height: 70px;
      display: block;
    }

    .hourly__temp {
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      margin: 0;
    }

    .hourly__divider {
      width: 100%;
      height: 1px;
      background: rgba(255, 255, 255, 0.4);
      margin: 8px 0 12px;
    }

    .hourly__details {
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: 100%;
      margin-top: 4px;
      align-items: center;
    }

    .hourly__details_element {
      display: flex;
      flex-direction: row;
      align-items: center;
    }

    .hourly__details p {
      margin: 0;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.85);
      text-align: center;
    }
    
    .branding {
      margin: 14px 0 0;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
    }

    ::slotted(a[slot="branding"]) {
      color: inherit;
      text-decoration: none;
    }

    .branding a:hover {
      text-decoration: underline;
    }
  </style>

  <div class="widget">
    <div class="current">
      <div class="top-row">
        <div class="weather-text">
          <p id="location">--</p>
          <div class="temperature-row">
            <p id="temperature">--</p>
            <div class="weather-details">
              <p id="current-weather">--</p>
              <p id="apparent-temperature">--</p>
            </div>
          </div>
        </div>
        <a href="https://frogcast.com" target="_blank" rel="noopener noreferrer">
          <img class="brand-logo" src="frogcast.webp" alt="Frogcast Home">
        </a>
      </div>

      <div class="additional-weather">
        <div class="current-precipitation">
          <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 512 512"><title xmlns="">raindrop-measure</title><defs><linearGradient id="SVGdPJ1vbNB" x1="310.5" x2="425.5" y1="152.5" y2="351.5" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#d4d7dd"/><stop offset=".5" stop-color="#d4d7dd"/><stop offset="1" stop-color="#bec1c6"/></linearGradient><clipPath id="SVGx2lRIdVh"><path fill="none"><animate attributeName="d" calcMode="spline" dur="3s" keySplines=".42, 0, .58, 1; .42, 0, .58, 1" repeatCount="indefinite" values="M168,252H344V380H168Z; M168,220H376V380H168Z; M168,252H344V380H168Z"/></path></clipPath><symbol id="SVG7o6ULbmV" viewBox="0 0 175 260.9"><path fill="none" stroke="#ffffff" stroke-miterlimit="10" stroke-width="15" d="M87.5 13.4c-48.7 72-80 117-80 160.7s35.8 79.3 80 79.3s80-35.5 80-79.3s-31.3-88.8-80-160.7Z"/></symbol></defs><path fill="none" stroke="#ffffff" stroke-miterlimit="10" stroke-width="15" d="M256 132c-48.7 72-80 117-80 160.8s35.8 79.2 80 79.2s80-35.5 80-79.3S304.7 204 256 132Z"/><path fill="none" stroke="#ffffff" stroke-linecap="round" stroke-linejoin="round" stroke-width="6" d="M352 132h32v240h-32m8-120h24m-16 56h16m-16-120h16"/><g clip-path="url(#SVGx2lRIdVh)"><use width="175" height="260.9" href="#SVG7o6ULbmV" transform="translate(168.61 119.2)"/></g></svg>
          <p id="current-precipitation">--</p>
        </div>
        <div class="current-wind">
          <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 512 512" role="img" style="">
            <title style="fill:rgb(0, 0, 0);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">Wind</title>
            <desc style="fill:rgb(0, 0, 0);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">Deux lignes courbes représentant le vent</desc>
            <defs>
              <symbol id="wind" viewBox="0 0 342 234">
                <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="18" d="M264.2 21.3A40 40 0 1 1 293 89H9"/>
                <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="18" d="M148.2 212.7A40 40 0 1 0 177 145H9"/>
              </symbol>
            </defs>
            <use width="342" height="234" href="#wind" transform="translate(85 139)" style="fill:rgb(0, 0, 0);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
          </svg>
          <p id="current-wind">--</p>
        </div>
      </div>
    </div>

    <section class="forecast">
      <p>Forecast</p>
      <div class="forecast__days" id="forecastDays"></div>
    </section>

    <section class="hourly">
      <h3 class="hourly__title">Hourly details</h3>
      <div class="hourly__list" id="hourlyList"></div>
    </section>

    <div class="branding">
      <slot name="branding"></slot>
    </div>

    <div id="svg-library" hidden>
      <!-- STATES -->
      <svg id="icon-sunny" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 128 128">
        <g id="clear-day__clear-day">
          <g id="clear-day__Sun">
            <circle id="clear-day__Core" cx="64" cy="64" r="19.5" fill="url(#sunny__paint0)" stroke="#f8af18"/>
            <g id="clear-day__Rays">
              <path fill="#f8af18" d="M61 19a3 3 0 1 1 6 0v14a3 3 0 0 1-6 0zM93.699 30.059A3 3 0 1 1 97.94 34.3l-9.9 9.9a3 3 0 1 1-4.242-4.243zM109 61a3 3 0 1 1 0 6H95a3 3 0 1 1 0-6zM97.941 93.699a3 3 0 1 1-4.243 4.242l-9.899-9.9a3 3 0 1 1 4.243-4.242zM61 95a3 3 0 1 1 6 0v14a3 3 0 1 1-6 0zM39.958 83.799a3 3 0 1 1 4.243 4.243l-9.9 9.9a3 3 0 1 1-4.242-4.243zM33 61a3 3 0 1 1 0 6H19a3 3 0 0 1 0-6zM44.201 39.958a3 3 0 1 1-4.243 4.243l-9.9-9.9a3 3 0 1 1 4.243-4.242z"/>
            </g>
          </g>
        </g>
        <defs>
          <linearGradient id="sunny__paint0" x1="64" x2="64" y1="44" y2="84" gradientUnits="userSpaceOnUse">
            <stop stop-color="#fbbf24"/>
            <stop offset="1" stop-color="#f8af18"/>
          </linearGradient>
        </defs>
      </svg>

      <svg id="icon-partly-cloudy" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 128 128">
        <defs>
          <style>
            .pc-sun { fill: url(#partly-cloudy__sunGradient); stroke: #f8af18; }
            .pc-none { fill: none; }
            .pc-cloud { fill: url(#partly-cloudy__cloudGradient); stroke: #e6effc; stroke-miterlimit: 10; }
            .pc-clip { clip-path: url(#partly-cloudy__clip); }
            .pc-ray { fill: #f8af18; }
          </style>
          <clipPath id="partly-cloudy__clip">
            <rect class="pc-none" width="128" height="128"/>
          </clipPath>
          <linearGradient id="partly-cloudy__sunGradient" x1="50" y1="81" x2="50" y2="55" gradientTransform="translate(0 130) scale(1 -1)" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#fbbf24"/>
            <stop offset="1" stop-color="#f8af18"/>
          </linearGradient>
          <linearGradient id="partly-cloudy__cloudGradient" x1="69.41" y1="66.12" x2="69.41" y2="42.38" gradientTransform="translate(0 130) scale(1 -1)" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#f3f7fe"/>
            <stop offset="1" stop-color="#e6effc"/>
          </linearGradient>
        </defs>
        <g class="pc-clip">
          <g id="mostly-clear-day__mostly-clear-day">
            <g id="mostly-clear-day__Sky">
              <g id="mostly-clear-day__Sun">
                <circle id="mostly-clear-day__Core" class="pc-sun" cx="50" cy="62" r="12.5"/>
                <g id="mostly-clear-day__Rays">
                  <path class="pc-ray" d="M48,32c0-1.1.9-2,2-2s2,.9,2,2v9.33c0,1.1-.9,2-2,2s-2-.9-2-2v-9.33ZM69.8,39.37c.77-.79,2.03-.82,2.83-.05.79.77.82,2.03.05,2.83-.02.02-.03.03-.05.05l-6.6,6.6c-.78.78-2.05.78-2.83,0s-.78-2.05,0-2.83l6.6-6.6ZM80,60c1.1,0,2,.9,2,2s-.9,2-2,2h-9.33c-1.1,0-2-.9-2-2s.9-2,2-2h9.33ZM72.63,81.8c.79.77.82,2.03.05,2.83-.77.79-2.03.82-2.83.05-.02-.02-.03-.03-.05-.05l-6.6-6.6c-.78-.78-.78-2.05,0-2.83.78-.78,2.05-.78,2.83,0h0l6.6,6.6ZM48,82.67c0-1.1.9-2,2-2s2,.9,2,2v9.33c0,1.1-.9,2-2,2s-2-.9-2-2v-9.33ZM33.97,75.2c.78-.78,2.05-.78,2.83,0,.78.78.78,2.05,0,2.83l-6.6,6.6c-.78.78-2.05.78-2.83,0-.78-.78-.78-2.05,0-2.83h0l6.6-6.6ZM29.33,60c1.1,0,2,.9,2,2s-.9,2-2,2h-9.33c-1.1,0-2-.9-2-2s.9-2,2-2h9.33ZM36.8,45.97c.78.78.78,2.05,0,2.83s-2.05.78-2.83,0l-6.6-6.6c-.78-.78-.78-2.05,0-2.83.78-.78,2.05-.78,2.83,0h0l6.6,6.6Z"/>
                </g>
              </g>
              <g id="mostly-clear-day__Clouds">
                <g id="mostly-clear-day__Cloud">
                  <path id="mostly-clear-day__Cloud_2" class="pc-cloud" d="M65.06,68.42c2.42-3.65,7.53-5.23,11.85-3.54,4.35,1.7,6.7,6.2,5.58,10.36l-.11.43.48-.02c3.57-.15,6.55,2.59,6.55,5.82s-2.8,5.83-6.27,5.83c-9,0-18,0-26.99,0-3.48,0-6.39-2.55-6.71-5.68-.32-3.13,2.03-6.15,5.45-6.75l.35-.06-.06-.32c-.41-2.2.62-4.5,2.64-5.78,1.99-1.26,4.67-1.33,6.73-.17l.31.17.19-.29Z"/>
                </g>
              </g>
            </g>
          </g>
        </g>
      </svg>
      <svg id="icon-mostly-cloudy" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 128 128"><g id="partly-cloudy-day__partly-cloudy-day" clip-path="url(#partly-cloudy-day__clip0_1858_8241)"><g id="partly-cloudy-day__Sky"><g id="partly-cloudy-day__Sun"><circle id="partly-cloudy-day__Core" cx="39" cy="51" r="8.5" fill="url(#partly-cloudy-day__paint0_linear_1858_8241)" stroke="#f8af18"/><g id="partly-cloudy-day__Rays"><path fill="#f8af18" d="M37.688 31.313a1.312 1.312 0 1 1 2.624 0v6.125a1.312 1.312 0 1 1-2.624 0zM51.993 36.15a1.312 1.312 0 1 1 1.856 1.857l-4.33 4.33a1.312 1.312 0 1 1-1.857-1.855zM58.688 49.688a1.312 1.312 0 1 1 0 2.624h-6.126a1.312 1.312 0 1 1 0-2.624zM53.85 63.993a1.312 1.312 0 1 1-1.857 1.856l-4.33-4.33a1.312 1.312 0 1 1 1.855-1.857zM37.688 64.563a1.312 1.312 0 1 1 2.624 0v6.124a1.312 1.312 0 1 1-2.624 0zM28.482 59.662a1.312 1.312 0 1 1 1.856 1.856l-4.331 4.331a1.312 1.312 0 1 1-1.856-1.856zM25.438 49.688a1.312 1.312 0 1 1 0 2.624h-6.125a1.312 1.312 0 1 1 0-2.624zM30.338 40.482a1.312 1.312 0 1 1-1.856 1.856l-4.331-4.331a1.312 1.312 0 1 1 1.856-1.856z"/></g></g><g id="partly-cloudy-day__Clouds"><g id="partly-cloudy-day__Cloud"><path id="partly-cloudy-day__Cloud_2" fill="url(#partly-cloudy-day__paint1_linear_1858_8241)" stroke="#e6effc" stroke-miterlimit="10" d="M55.262 48.475c4.86-7.864 15.035-11.095 23.553-7.532 8.506 3.56 13.323 13.06 11.088 22.022l-.161.65.669-.03c7.01-.306 13.089 5.407 13.089 12.443 0 6.811-5.728 12.472-12.523 12.472H37.954c-6.826.002-12.751-5.33-13.395-12.14-.643-6.808 4.178-13.148 10.884-14.415l.483-.092-.084-.484c-.816-4.745 1.284-9.652 5.263-12.356 3.99-2.712 9.34-2.86 13.475-.373l.423.255z"/></g></g></g></g><defs><linearGradient id="partly-cloudy-day__paint0_linear_1858_8241" x1="39" x2="39" y1="42" y2="60" gradientUnits="userSpaceOnUse"><stop stop-color="#fbbf24"/><stop offset="1" stop-color="#f8af18"/></linearGradient><linearGradient id="partly-cloudy-day__paint1_linear_1858_8241" x1="64.001" x2="64.001" y1="39" y2="89" gradientUnits="userSpaceOnUse"><stop stop-color="#f3f7fe"/><stop offset="1" stop-color="#e6effc"/></linearGradient><clipPath id="partly-cloudy-day__clip0_1858_8241"><rect width="128" height="128" fill="#fff"/></clipPath></defs></svg>
      
      <svg id="icon-clear-night" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 128 128">
        <g id="clear-night__clear-night">
          <g id="clear-night__Moon">
            <path id="clear-night__Moon_2" fill="url(#clear-night__moonGradient)" stroke="#72b9d5" stroke-linecap="round" stroke-linejoin="round" d="M60.302 32.582C55.282 53.7 73.6 74.348 95.325 72.515 91.52 85.77 79.2 95.5 64.536 95.5 46.837 95.5 32.5 81.344 32.5 63.898c0-16.03 12.107-29.27 27.802-31.316"/>
          </g>
        </g>
        <defs>
          <linearGradient id="clear-night__moonGradient" x1="64" x2="64" y1="32" y2="96" gradientUnits="userSpaceOnUse">
            <stop stop-color="#86c3db"/>
            <stop offset="1" stop-color="#72b9d5"/>
          </linearGradient>
        </defs>
      </svg>

      <svg id="icon-partly-cloudy-night" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 128 128">
        <defs>
          <style>
            .pcn-none { fill: none; }
            .pcn-moon { fill: url(#partly-cloudy-night__moonGradient); stroke: #72b9d5; stroke-linecap: round; stroke-linejoin: round; }
            .pcn-cloud { fill: url(#partly-cloudy-night__cloudGradient); stroke: #e6effc; stroke-miterlimit: 10; }
            .pcn-clip { clip-path: url(#partly-cloudy-night__clip); }
          </style>
          <clipPath id="partly-cloudy-night__clip">
            <rect class="pcn-none" width="128" height="128"/>
          </clipPath>
          <linearGradient id="partly-cloudy-night__moonGradient" x1="54.91" y1="88" x2="54.91" y2="44" gradientTransform="translate(0 130) scale(1 -1)" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#86c3db"/>
            <stop offset="1" stop-color="#72b9d5"/>
          </linearGradient>
          <linearGradient id="partly-cloudy-night__cloudGradient" x1="69" y1="68.09" x2="69" y2="41.91" gradientTransform="translate(0 130) scale(1 -1)" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#f3f7fe"/>
            <stop offset="1" stop-color="#e6effc"/>
          </linearGradient>
        </defs>
        <g class="pcn-clip">
          <g id="mostly-clear-night__mostly-clear-night">
            <g id="mostly-clear-night__Sky">
              <g id="mostly-clear-night__Moon">
                <path id="mostly-clear-night__Moon_2" class="pcn-moon" d="M52.25,42.59c-3.31,14.61,9.42,28.52,24.07,27.44-2.67,8.94-11.02,15.47-20.95,15.47-12.08,0-21.87-9.67-21.87-21.57,0-10.86,8.15-19.85,18.75-21.34"/>
              </g>
              <g id="mostly-clear-night__Clouds">
                <g id="mostly-clear-night__Cloud">
                  <path id="mostly-clear-night__Cloud_2" class="pcn-cloud" d="M64.65,66.92c2.42-4.02,7.53-5.76,11.85-3.9,4.35,1.87,6.7,6.83,5.58,11.42l-.11.47.48-.02c3.57-.16,6.55,2.86,6.55,6.41s-2.8,6.43-6.27,6.43c-9,0-18,0-26.99,0-3.48,0-6.39-2.81-6.71-6.26-.32-3.46,2.03-6.78,5.45-7.44l.35-.07-.06-.35c-.41-2.43.62-4.96,2.64-6.37,1.99-1.39,4.67-1.47,6.73-.19l.31.19.19-.31Z"/>
                </g>
              </g>
            </g>
          </g>
        </g>
      </svg>

      <svg id="icon-mostly-cloudy-night" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 128 128">
        <g id="partly-cloudy-night__partly-cloudy-night" clip-path="url(#partly-cloudy-night__clip0)">
          <g id="partly-cloudy-night__Sky">
            <g id="partly-cloudy-night__Moon">
              <path id="partly-cloudy-night__Moon_2" fill="url(#partly-cloudy-night__moonGradient)" stroke="#72b9d5" stroke-linecap="round" stroke-linejoin="round" d="M35.115 34.595c-1.737 8.568 5.638 16.62 14.198 16.188-1.64 5.05-6.424 8.717-12.095 8.717-7.03 0-12.718-5.621-12.718-12.541 0-6.214 4.588-11.375 10.615-12.364"/>
            </g>
            <g id="partly-cloudy-night__Clouds">
              <g id="partly-cloudy-night__Cloud">
                <path id="partly-cloudy-night__Cloud_2" fill="url(#partly-cloudy-night__cloudGradient)" stroke="#e6effc" stroke-miterlimit="10" d="M55.262 48.475c4.86-7.864 15.035-11.095 23.553-7.532 8.506 3.56 13.323 13.06 11.088 22.022l-.161.65.669-.03c7.01-.306 13.089 5.407 13.089 12.443 0 6.811-5.728 12.472-12.523 12.472H37.954c-6.826.002-12.751-5.33-13.395-12.14-.643-6.808 4.178-13.148 10.884-14.415l.483-.092-.084-.484c-.816-4.745 1.284-9.652 5.263-12.356 3.99-2.712 9.34-2.86 13.475-.373l.423.255z"/>
              </g>
            </g>
          </g>
        </g>
        <defs>
          <linearGradient id="partly-cloudy-night__moonGradient" x1="37" x2="37" y1="34" y2="60" gradientUnits="userSpaceOnUse">
            <stop stop-color="#86c3db"/>
            <stop offset="1" stop-color="#72b9d5"/>
          </linearGradient>
          <linearGradient id="partly-cloudy-night__cloudGradient" x1="64.001" x2="64.001" y1="39" y2="89" gradientUnits="userSpaceOnUse">
            <stop stop-color="#f3f7fe"/>
            <stop offset="1" stop-color="#e6effc"/>
          </linearGradient>
          <clipPath id="partly-cloudy-night__clip0">
            <rect width="128" height="128" fill="#fff"/>
          </clipPath>
        </defs>
      </svg>

      <svg id="icon-overcast" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 128 128">
        <g id="overcast__overcast" clip-path="url(#overcast__clip0)">
          <g id="overcast__Sky">
            <g id="overcast__Clouds">
              <g id="overcast__Secondary Cloud">
                <path id="overcast__Cloud" fill="url(#overcast__cloudDarkGradient)" stroke="#94a3b8" stroke-miterlimit="10" d="M83.84 48.693c2.404-3.735 7.375-5.164 11.478-3.516 4.043 1.624 6.496 6.012 5.392 10.26l-.17.653.675-.029c3.281-.137 6.285 2.404 6.285 5.713 0 3.202-2.831 5.726-6.011 5.726H74.977c-3.21 0-6.132-2.382-6.448-5.593-.315-3.2 2.088-6.066 5.235-6.636l.491-.09-.088-.49c-.394-2.198.645-4.442 2.518-5.664 1.925-1.256 4.492-1.32 6.483-.17l.413.237z"/>
              </g>
              <g id="overcast__Cloud_2">
                <path id="overcast__Cloud_3" fill="url(#overcast__cloudLightGradient)" stroke="#e6effc" stroke-miterlimit="10" d="M55.262 48.475c4.86-7.864 15.035-11.095 23.553-7.532 8.506 3.56 13.323 13.06 11.088 22.022l-.161.65.669-.03c7.01-.306 13.089 5.407 13.089 12.443 0 6.811-5.728 12.472-12.523 12.472H37.954c-6.826.002-12.751-5.33-13.395-12.14-.643-6.808 4.178-13.148 10.884-14.415l.483-.092-.084-.484c-.816-4.745 1.284-9.652 5.263-12.356 3.99-2.712 9.34-2.86 13.475-.373l.423.255z"/>
              </g>
            </g>
          </g>
        </g>
        <defs>
          <linearGradient id="overcast__cloudDarkGradient" x1="88" x2="88" y1="44" y2="68" gradientUnits="userSpaceOnUse">
            <stop stop-color="#b0bccd"/>
            <stop offset="1" stop-color="#94a3b8"/>
          </linearGradient>
          <linearGradient id="overcast__cloudLightGradient" x1="64.001" x2="64.001" y1="39" y2="89" gradientUnits="userSpaceOnUse">
            <stop stop-color="#f3f7fe"/>
            <stop offset="1" stop-color="#e6effc"/>
          </linearGradient>
          <clipPath id="overcast__clip0">
            <rect width="128" height="128" fill="#fff"/>
          </clipPath>
        </defs>
      </svg>     

      <!-- PRECIPITATION -->
      <svg id="icon-snow-and-rain" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 128 128">
        <defs>
          <style>
            .sr-drop {
              stroke: #0a5ad4;
              stroke-linecap: round;
              stroke-width: 4px;
              fill: none;
            }

            .sr-snow {
              fill: #86c3db;
            }

            .sr-clip {
              clip-path: url(#snow-rain__clip);
            }

            .sr-none {
              fill: none;
            }
          </style>
          <clipPath id="snow-rain__clip">
            <rect class="sr-none" width="128" height="128"/>
          </clipPath>
        </defs>
        <g class="sr-clip">
          <g id="snow-rain__sleet">
            <g id="snow-rain__Precipitation">
              <g id="snow-rain__Snowflakes">
                <path id="snow-rain__Snowflake_1" class="sr-snow" d="M52.58,90.37l-1.21-.69c.11-.44.11-.91,0-1.35l1.21-.69c.4-.23.54-.73.31-1.13,0,0,0,0,0-.01-.24-.4-.75-.54-1.15-.31l-1.21.69c-.34-.32-.74-.55-1.18-.68v-1.38c-.02-.46-.39-.82-.84-.82-.46,0-.83.36-.84.82v1.38c-.44.13-.85.36-1.19.67l-1.21-.69c-.41-.23-.92-.09-1.16.32-.05.09-.09.19-.1.3-.04.34.12.67.42.83l1.2.69c-.11.44-.1.91,0,1.35l-1.21.69c-.3.17-.46.5-.42.83.04.34.29.62.62.7.22.06.45.03.64-.08l1.21-.69c.33.32.74.55,1.18.68v1.38c.02.46.39.82.84.82.46,0,.83-.36.84-.82v-1.38c.44-.13.85-.36,1.18-.67l1.21.69c.41.23.92.09,1.16-.31.05-.09.09-.2.1-.3.04-.34-.12-.67-.42-.83M47.87,90.09c-.44-.25-.69-.75-.62-1.25.07-.51.43-.92.93-1.05.49-.13,1.02.04,1.33.44.31.4.35.95.09,1.39-.36.6-1.12.8-1.73.46"/>
                <path id="snow-rain__Snowflake_2" class="sr-snow" d="M67.58,106.37l-1.2-.69c.11-.44.1-.91,0-1.35l1.21-.69c.4-.23.54-.73.31-1.13,0,0,0,0,0-.01-.24-.4-.75-.54-1.15-.31l-1.21.69c-.34-.32-.74-.55-1.18-.68v-1.38c-.02-.46-.39-.82-.84-.82-.46,0-.83.36-.84.82v1.38c-.44.13-.85.36-1.19.67l-1.21-.69c-.41-.23-.92-.09-1.16.32-.05.09-.09.19-.1.3-.04.34.12.67.42.83l1.2.69c-.11.44-.1.91,0,1.35l-1.21.69c-.3.17-.46.5-.42.83.04.34.29.62.62.7.22.06.45.03.64-.08l1.21-.69c.33.32.74.55,1.18.68v1.38c.02.46.39.82.84.82.46,0,.83-.36.84-.82v-1.38c.44-.13.85-.36,1.18-.67l1.21.69c.41.23.92.09,1.16-.31.05-.09.09-.2.1-.3.04-.34-.12-.67-.42-.83M62.87,106.09c-.44-.25-.69-.75-.62-1.25.07-.51.43-.92.93-1.05.49-.13,1.02.04,1.33.44.31.4.35.95.09,1.39-.36.6-1.12.8-1.73.46"/>
                <path id="snow-rain__Snowflake_3" class="sr-snow" d="M82.58,90.37l-1.2-.69c.11-.44.1-.91,0-1.35l1.21-.69c.4-.23.54-.73.31-1.13,0,0,0,0,0-.01-.24-.4-.75-.54-1.15-.31l-1.21.69c-.34-.32-.74-.55-1.18-.68v-1.38c-.02-.46-.39-.82-.84-.82-.46,0-.83.36-.84.82v1.38c-.44.13-.85.36-1.18.67l-1.21-.69c-.41-.23-.92-.09-1.16.32-.05.09-.09.19-.1.3-.04.34.12.67.42.83l1.2.69c-.11.44-.11.91,0,1.35l-1.21.69c-.3.17-.46.5-.42.83.04.34.29.62.62.7.22.06.45.03.64-.08l1.21-.69c.33.32.74.55,1.18.68v1.38c.02.46.39.82.84.82.46,0,.83-.36.84-.82v-1.38c.44-.13.85-.36,1.18-.67l1.21.69c.41.23.92.09,1.16-.31.05-.09.09-.2.1-.3.04-.34-.12-.67-.42-.83M77.87,90.09c-.44-.25-.69-.75-.62-1.25.07-.51.43-.92.93-1.05.49-.13,1.02.04,1.33.44.31.4.35.95.09,1.39-.36.6-1.12.8-1.73.46"/>
              </g>
              <g id="snow-rain__Raindrops">
                <path id="snow-rain__Raindrop_1" class="sr-drop" d="M52,104v3"/>
                <path id="snow-rain__Raindrop_2" class="sr-drop" d="M64,88v3"/>
                <path id="snow-rain__Raindrop_3" class="sr-drop" d="M76,104v3"/>
              </g>
            </g>
          </g>
        </g>
      </svg>

      <svg id="icon-snow" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 128 128">
        <defs>
          <style>
            .sn-none {
              fill: none;
            }

            .sn-snow {
              fill: #86c3db;
            }

            .sn-clip {
              clip-path: url(#snow__clip);
            }
          </style>
          <clipPath id="snow__clip">
            <rect class="sn-none" width="128" height="128"/>
          </clipPath>
        </defs>
        <g class="sn-clip">
          <g id="snow__snow">
            <g id="snow__Precipitation">
              <g id="snow__Snowflakes">
                <path id="snow__Snowflake_1" class="sn-snow" d="M52.58,98.37l-1.21-.69c.11-.44.11-.91,0-1.35l1.21-.69c.4-.23.54-.73.31-1.13,0,0,0,0,0-.01-.24-.4-.75-.54-1.15-.31l-1.21.69c-.34-.32-.74-.55-1.18-.68v-1.38c-.02-.46-.39-.82-.84-.82-.46,0-.83.36-.84.82v1.38c-.44.13-.85.36-1.19.67l-1.21-.69c-.41-.23-.92-.09-1.16.32-.05.09-.09.19-.1.3-.04.34.12.67.42.83l1.2.69c-.11.44-.1.91,0,1.35l-1.21.69c-.3.17-.46.5-.42.83.04.34.29.62.62.7.22.06.45.03.64-.08l1.21-.69c.33.32.74.55,1.18.68v1.38c.02.46.39.82.84.82.46,0,.83-.36.84-.82v-1.38c.44-.13.85-.36,1.18-.67l1.21.69c.41.23.92.09,1.16-.31.05-.09.09-.2.1-.3.04-.34-.12-.67-.42-.83M47.87,98.09c-.44-.25-.69-.75-.62-1.25.07-.51.43-.92.93-1.05.49-.13,1.02.04,1.33.44.31.4.35.95.09,1.39-.36.6-1.12.8-1.73.46"/>
                <path id="snow__Snowflake_2" class="sn-snow" d="M67.58,90.37l-1.2-.69c.11-.44.1-.91,0-1.35l1.21-.69c.4-.23.54-.73.31-1.13,0,0,0,0,0-.01-.24-.4-.75-.54-1.15-.31l-1.21.69c-.34-.32-.74-.55-1.18-.68v-1.38c-.02-.46-.39-.82-.84-.82-.46,0-.83.36-.84.82v1.38c-.44.13-.85.36-1.19.67l-1.21-.69c-.41-.23-.92-.09-1.16.32-.05.09-.09.19-.1.3-.04.34.12.67.42.83l1.2.69c-.11.44-.1.91,0,1.35l-1.21.69c-.3.17-.46.5-.42.83.04.34.29.62.62.7.22.06.45.03.64-.08l1.21-.69c.33.32.74.55,1.18.68v1.38c.02.46.39.82.84.82.46,0,.83-.36.84-.82v-1.38c.44-.13.85-.36,1.18-.67l1.21.69c.41.23.92.09,1.16-.31.05-.09.09-.2.1-.3.04-.34-.12-.67-.42-.83M62.87,90.09c-.44-.25-.69-.75-.62-1.25.07-.51.43-.92.93-1.05.49-.13,1.02.04,1.33.44.31.4.35.95.09,1.39-.36.6-1.12.8-1.73.46"/>
                <path id="snow__Snowflake_3" class="sn-snow" d="M82.58,98.37l-1.2-.69c.11-.44.1-.91,0-1.35l1.21-.69c.4-.23.54-.73.31-1.13,0,0,0,0,0-.01-.24-.4-.75-.54-1.15-.31l-1.21.69c-.34-.32-.74-.55-1.18-.68v-1.38c-.02-.46-.39-.82-.84-.82-.46,0-.83.36-.84.82v1.38c-.44.13-.85.36-1.18.67l-1.21-.69c-.41-.23-.92-.09-1.16.32-.05.09-.09.19-.1.3-.04.34.12.67.42.83l1.2.69c-.11.44-.11.91,0,1.35l-1.21.69c-.3.17-.46.5-.42.83.04.34.29.62.62.7.22.06.45.03.64-.08l1.21-.69c.33.32.74.55,1.18.68v1.38c.02.46.39.82.84.82.46,0,.83-.36.84-.82v-1.38c.44-.13.85-.36,1.18-.67l1.21.69c.41.23.92.09,1.16-.31.05-.09.09-.2.1-.3.04-.34-.12-.67-.42-.83M77.87,98.09c-.44-.25-.69-.75-.62-1.25.07-.51.43-.92.93-1.05.49-.13,1.02.04,1.33.44.31.4.35.95.09,1.39-.36.6-1.12.8-1.73.46"/>
              </g>
            </g>
          </g>
        </g>
      </svg>

      <svg id="icon-heavy-rain" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 128 128">
        <defs>
          <style>
            .hr-drop {
              stroke: #0a5ad4;
              stroke-linecap: round;
              stroke-width: 4px;
              fill: none;
            }

            .hr-none {
              fill: none;
            }

            .hr-clip {
              clip-path: url(#heavy-rain__clip);
            }
          </style>
          <clipPath id="heavy-rain__clip">
            <rect class="hr-none" width="128" height="128"/>
          </clipPath>
        </defs>
        <g class="hr-clip">
          <g id="rain__rain">
            <g id="rain__Precipitation">
              <g id="rain__Raindrops">
                <path id="rain__Raindrop_1" class="hr-drop" d="M52,91v12"/>
                <path id="rain__Raindrop_2" class="hr-drop" d="M64,83v12"/>
                <path id="rain__Raindrop_3" class="hr-drop" d="M76,91v12"/>
              </g>
            </g>
          </g>
        </g>
      </svg>

      <svg id="icon-rain" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 128 128">
        <defs>
          <style>
            .r-drop {
              stroke: #0a5ad4;
              stroke-linecap: round;
              stroke-width: 4px;
              fill: none;
            }

            .r-none {
              fill: none;
            }

            .r-clip {
              clip-path: url(#rain__clip);
            }
          </style>
          <clipPath id="rain__clip">
            <rect class="r-none" width="128" height="128"/>
          </clipPath>
        </defs>
        <g class="r-clip">
          <g id="drizzle__drizzle">
            <g id="drizzle__Precipitation">
              <g id="drizzle__Raindrops">
                <path id="drizzle__Raindrop_1" class="r-drop" d="M52,95v3"/>
                <path id="drizzle__Raindrop_2" class="r-drop" d="M64,87v3"/>
                <path id="drizzle__Raindrop_3" class="r-drop" d="M76,95v3"/>
              </g>
            </g>
          </g>
        </g>
      </svg>

      <!-- STORM -->
      <svg id="icon-light-thunderstorm" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 128 128">
        <defs>
          <style>
            .lt-bolt {
              fill: url(#light-thunderstorm__boltGradient);
              stroke: #f6a823;
              stroke-miterlimit: 10;
            }

            .lt-none {
              fill: none;
            }

            .lt-clip {
              clip-path: url(#light-thunderstorm__clip);
            }
          </style>
          <clipPath id="light-thunderstorm__clip">
            <rect class="lt-none" width="128" height="128"/>
          </clipPath>
          <linearGradient id="light-thunderstorm__boltGradient" x1="59.81" y1="44.18" x2="68.73" y2="39.06" gradientTransform="translate(0 130) scale(1 -1)" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#f7b23b"/>
            <stop offset="1" stop-color="#f6a823"/>
          </linearGradient>
        </defs>
        <g class="lt-clip">
          <g id="thunderstorms__thunderstorms">
            <g id="thunderstorms__Lightning">
              <path id="thunderstorms__Lightning_Bolt" class="lt-bolt" d="M67.14,79.36l-3.42,6.52-.17.33h5.3l-8.09,10.82,1.59-7.57.06-.27h-3.55l3.43-9.83h4.85Z"/>
            </g>
          </g>
        </g>
      </svg>

      <svg id="icon-moderate-thunderstorm" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 128 128">
        <defs>
          <style>
            .mt-bolt {
              fill: url(#moderate-thunderstorm__boltGradient);
              stroke: #f6a823;
              stroke-miterlimit: 10;
            }

            .mt-none {
              fill: none;
            }

            .mt-clip {
              clip-path: url(#moderate-thunderstorm__clip);
            }
          </style>
          <clipPath id="moderate-thunderstorm__clip">
            <rect class="mt-none" width="128" height="128"/>
          </clipPath>
          <linearGradient id="moderate-thunderstorm__boltGradient" x1="54.84" y1="47.1" x2="74.73" y2="35.68" gradientTransform="translate(0 130) scale(1 -1)" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#f7b23b"/>
            <stop offset="1" stop-color="#f6a823"/>
          </linearGradient>
        </defs>
        <g class="mt-clip">
          <g id="thunderstorms__thunderstorms">
            <g id="thunderstorms__Lightning">
              <path id="thunderstorms__Lightning_Bolt" class="mt-bolt" d="M71.17,68.5l-7.62,14.54-.38.73h11.83l-18.05,24.12,3.54-16.88.13-.6h-7.91l7.65-21.91h10.82Z"/>
            </g>
          </g>
        </g>
      </svg>

      <svg id="icon-severe-thunderstorm" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 128 128">
        <defs>
          <style>
            .st-bolt-main {
              fill: url(#severe-thunderstorm__boltGradientMain);
              stroke: #f6a823;
              stroke-miterlimit: 10;
            }

            .st-bolt-left {
              fill: url(#severe-thunderstorm__boltGradientLeft);
              stroke: #f6a823;
              stroke-miterlimit: 10;
            }

            .st-bolt-right {
              fill: url(#severe-thunderstorm__boltGradientRight);
              stroke: #f6a823;
              stroke-miterlimit: 10;
            }

            .st-none {
              fill: none;
            }

            .st-clip {
              clip-path: url(#severe-thunderstorm__clip);
            }
          </style>
          <clipPath id="severe-thunderstorm__clip">
            <rect class="st-none" width="128" height="128"/>
          </clipPath>
          <linearGradient id="severe-thunderstorm__boltGradientMain" x1="54.84" y1="47.1" x2="74.73" y2="35.68" gradientTransform="translate(0 130) scale(1 -1)" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#f7b23b"/>
            <stop offset="1" stop-color="#f6a823"/>
          </linearGradient>
          <linearGradient id="severe-thunderstorm__boltGradientLeft" x1="39.2" y1="43.87" x2="48.12" y2="38.75" xlink:href="#severe-thunderstorm__boltGradientMain"/>
          <linearGradient id="severe-thunderstorm__boltGradientRight" x1="80.31" y1="43.87" x2="89.23" y2="38.75" xlink:href="#severe-thunderstorm__boltGradientMain"/>
        </defs>
        <g class="st-clip">
          <g id="thunderstorms__thunderstorms">
            <g id="thunderstorms__Lightning">
              <path id="thunderstorms__Lightning_Bolt" class="st-bolt-main" d="M71.17,68.5l-7.62,14.54-.38.73h11.83l-18.05,24.12,3.54-16.88.13-.6h-7.91l7.65-21.91h10.82Z"/>
            </g>
          </g>
        </g>
        <g id="thunderstorms__Lightning1">
          <path id="thunderstorms__Lightning_Bolt1" class="st-bolt-right" d="M87.64,79.67l-3.42,6.52-.17.33h5.3l-8.09,10.82,1.59-7.57.06-.27h-3.55l3.43-9.83h4.85Z"/>
        </g>
        <g id="thunderstorms__Lightning2">
          <path id="thunderstorms__Lightning_Bolt2" class="st-bolt-left" d="M46.52,79.67l-3.42,6.52-.17.33h5.3l-8.09,10.82,1.59-7.57.06-.27h-3.55l3.43-9.83h4.85Z"/>
        </g>
      </svg>
    </div>
    
  </div>
`;
  }

  /**
   * Adds an event when clicking a day card that renders the forecast for that day and resets the display
   */
  setupEvents() {
    this.shadowRoot.addEventListener("click", (e) => {
      const card = e.target.closest(".forecast__day");
      if (!card) return;

      this.selectedDayIndex = Number(card.dataset.dayIndex);

      this.renderForecast();
      this.renderHourlyDetails(this.selectedDayIndex);

      const hourlyList = this.shadowRoot.getElementById("hourlyList");
      if (hourlyList) hourlyList.scrollLeft = 0;
    });
  }

  /**
   * Gets the user's closest city name and stores the forecasted data for their coordinates, launches the forecast display functions
   * 
   */
  async loadForecast() {
    const location = this.shadowRoot.getElementById("location");

    if (!("geolocation" in navigator)) {
      location.textContent = "Geolocation is not supported by this browser.";
      return;
    }

    try {
      const position = await this.getPosition();
      this.latitude = position.coords.latitude;
      this.longitude = position.coords.longitude;
      
      console.log("Lat : ",this.latitude);
      console.log("Long : ", this.longitude);
      console.log("Accuracy:", position.coords.accuracy);

      if (position.coords.accuracy > 100) {
        console.warn("Location may be too imprecise");
      }

      const city = await this.getCityName(this.latitude, this.longitude);
      
      this.shadowRoot.getElementById("location").textContent = city || "Unknown location";;

      const apiData = await this.getField("t2m,rh2m,10m_wind_speed,10m_wind_direction,tcc,mtpa,ghi,mtpr,mtsr,storm_idx,10m_gust");

      const series = {};
      apiData.columns.forEach((col, colIndex) => {
        series[col] = apiData.index.map((timestamp, rowIndex) => ({
          timestamp,
          value: apiData.data[rowIndex][colIndex]
        }));
      });

      this.weatherData = {
        t2m: series["2m_temperature"],
        mtsr: series["mean_total_snow_rate"],
        mtpr: series["mean_total_precipitation_rate"],
        rh2m: series["2m_relative_humidity"],
        windDirection: series["10m_wind_direction"],
        storm_idx: series["storm_idx"],
        ghi: series["all_sky_global_horizontal_irradiance"],
        tcc: series["total_cloud_cover"],
        windSpeed: series["10m_wind_speed"],
        mtpa: series["mean_total_precipitation_accumulation"],
        windGust: series["10m_wind_gust"]
      };

      this.getTemperature();
      this.setCurrentWeather();
      this.getPrecipitation();
      this.getHumidity();
      this.getWind();
      this.getCloudCover();
      this.renderForecast();
      this.renderHourlyDetails(0);
    } catch (error) {
      location.textContent = `Error: ${error.message}`;
    }
  }

  /**
   * Generates the html code for the forecast based on the amount of days to show 
   * @returns the html for the Forecast section
   */
  renderForecast() {
    const container = this.shadowRoot.getElementById("forecastDays");
    if (!container) return;

    const days = this.groupForecastByDay(this.weatherData, this.dayAmount);

    container.innerHTML = days.map((day, index) => {
      const is3Day = this.dayAmount == 3;
      return `
        <article class="forecast__day ${index === this.selectedDayIndex ? 'forecast__day--selected' : ''} ${is3Day ? 'forecast__day--3day' : ''}" data-day-index="${index}">
          <p class="forecast__label">${day.label}</p>
          <div class="forecast__icon" id="forecast-icon-${index}"></div>

          ${is3Day 
            ? `
              <div class="forecast__temp-group forecast__temp-group--horizontal">
                <span class="forecast__temp-max">${this.formatTemperature(day.max)}</span>
                <span class="forecast__temp-min">${this.formatTemperature(day.min)}</span>
              </div>

              <div class="forecast__extra">
                <p class="forecast__extra-item forecast__mtpa">
                  <span class="forecast__extra-label">Precipitation:</span> ${this.formatPrecipitation(day.mtpa)}
                </p>
                <p class="forecast__extra-item forecast__wind">
                  <span class="forecast__extra-label">Wind:</span> ${this.formatSpeed(this.getAverage(day.windSpeed))} ${this.degreesToCardinal(this.getAverage(day.windDirection))}
                </p>
              </div>
            `
            : `
              <div class="forecast__temp-group forecast__temp-group--vertical">
                <p class="forecast__temp-max">${this.formatTemperature(day.max)}</p>
                <p class="forecast__temp-min">${this.formatTemperature(day.min)}</p>
              </div>
            `
          }
        </article>
      `;
    }).join("");    

    days.forEach((day, index) => {
      const holder = this.shadowRoot.getElementById(`forecast-icon-${index}`);
      if (!holder) return;
      const weatherState = this.getWeatherState(this.getAverage(day.ghi), this.getAverage(day.tcc));
      const precipitationState = this.getWeatherPrecipitation(this.getAverage(day.precip), this.getAverage(day.snowRate));
      const stormState = this.getWeatherStorm(this.getAverage(day.isStorm));

      const icon = this.getWeatherIcon(weatherState, precipitationState, stormState);
      holder.replaceChildren(icon);
    });
  }


  /**
   * Generates the html section for the hourly forecast of a selected day
   * @param {*} dayIndex the index of the day card 
   * @returns the html section for the hourly details
   */
  renderHourlyDetails(dayIndex = 0) {
    const container = this.shadowRoot.getElementById("hourlyList");
    if (!container || !this.weatherData?.t2m) return;

    const days = this.groupHourlyByDay(this.weatherData, this.dayAmount);
    const day = days[dayIndex];

    if (!day) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = day.hours.map((hour, index) => `
      <div class="hourly__item">
        <p class="hourly__time">${this.formatTime(hour.time)}</p>

        <div class="hourly__icon" id="hourly-icon-${index}"></div>

        <p class="hourly__temp">${this.formatTemperature(hour.t2m)}</p>

        <div class="hourly__divider"></div>

        <div class="hourly__details">
          <div class="hourly__details_element">
            <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 512 512"><title xmlns="">raindrop-measure</title><defs><linearGradient id="SVGdPJ1vbNB" x1="310.5" x2="425.5" y1="152.5" y2="351.5" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#d4d7dd"/><stop offset=".5" stop-color="#d4d7dd"/><stop offset="1" stop-color="#bec1c6"/></linearGradient><clipPath id="SVGx2lRIdVh"><path fill="none"><animate attributeName="d" calcMode="spline" dur="3s" keySplines=".42, 0, .58, 1; .42, 0, .58, 1" repeatCount="indefinite" values="M168,252H344V380H168Z; M168,220H376V380H168Z; M168,252H344V380H168Z"/></path></clipPath><symbol id="SVG7o6ULbmV" viewBox="0 0 175 260.9"><path fill="none" stroke="#ffffff" stroke-miterlimit="10" stroke-width="15" d="M87.5 13.4c-48.7 72-80 117-80 160.7s35.8 79.3 80 79.3s80-35.5 80-79.3s-31.3-88.8-80-160.7Z"/></symbol></defs><path fill="none" stroke="#ffffff" stroke-miterlimit="10" stroke-width="15" d="M256 132c-48.7 72-80 117-80 160.8s35.8 79.2 80 79.2s80-35.5 80-79.3S304.7 204 256 132Z"/><path fill="none" stroke="#ffffff" stroke-linecap="round" stroke-linejoin="round" stroke-width="6" d="M352 132h32v240h-32m8-120h24m-16 56h16m-16-120h16"/><g clip-path="url(#SVGx2lRIdVh)"><use width="175" height="260.9" href="#SVG7o6ULbmV" transform="translate(168.61 119.2)"/></g></svg>
            <p class="hourly__precipitation">${this.formatPrecipitation(hour.mtpr) ?? "--"}</p>
          </div>
          <div class="hourly__details_element">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 2048 2048"><title xmlns="">wind-direction</title><path fill="#ffffff" d="m1024 0l683 2048l-683-683l-683 683z"/></svg>
            <p class="hourly__wind-direction">${this.degreesToCardinal(hour.windDirection)}</p>
          </div>
          <div class="hourly__details_element">
            <svg xmlns="http://www.w3.org/2000/svg" width="1.3em" height="1.3em" width="512" height="512" viewBox="0 0 512 512">
              <title>Windsock</title>
              <path fill="none" stroke="#ffffff" stroke-linecap="round" stroke-linejoin="round" stroke-width="24" d="M148 376V136"/>
              <path fill="#ffffff" d="m191.4 137l28.8 4.3a6.4 6.4 0 0 1 5.4 6.3v73.7a6.4 6.4 0 0 1-5.4 6.3l-28.8 4.2a6.4 6.4 0 0 1-7.3-6.4v-82a6.4 6.4 0 0 1 7.3-6.3Z"/>
              <path fill="#ffffff" d="m260.6 146.1l28.8 4.2a6.4 6.4 0 0 1 5.4 6.3v55.6a6.4 6.4 0 0 1-5.5 6.3l-28.7 4.2a6.4 6.4 0 0 1-7.3-6.3v-64a6.4 6.4 0 0 1 7.3-6.3Z"/>
              <path fill="#ffffff" d="m329.8 155.2l28.7 4.2a6.4 6.4 0 0 1 5.5 6.3v37.4a6.4 6.4 0 0 1-5.5 6.3l-28.7 4.2a6.4 6.4 0 0 1-7.3-6.3v-45.8a6.4 6.4 0 0 1 7.3-6.3Z"/>
            </svg>
            <p class="hourly__wind-gust">${this.formatSpeed(hour.windGust)  ?? "--"}</p>
          </div>
          <div class="hourly__details_element">
            <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 512 512" role="img" style="">
              <title style="fill:rgb(0, 0, 0);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">Wind</title>
              <desc style="fill:rgb(0, 0, 0);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">Deux lignes courbes représentant le vent</desc>
              <defs>
                <symbol id="wind" viewBox="0 0 342 234">
                  <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="18" d="M264.2 21.3A40 40 0 1 1 293 89H9"/>
                  <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="18" d="M148.2 212.7A40 40 0 1 0 177 145H9"/>
                </symbol>
              </defs>
              <use width="342" height="234" href="#wind" transform="translate(85 139)" style="fill:rgb(0, 0, 0);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
            </svg>
            <p class="hourly__wind-speed">${this.formatSpeed(hour.windSpeed)?? "--"}</p>
          </div>
          <div class="hourly__details_element">
            <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 512 512"><title xmlns="">humidity</title><defs><symbol id="SVGsr3YqdGo" viewBox="0 0 175 260.9"><path fill="none" stroke="#ffffff" stroke-miterlimit="10" stroke-width="15" d="M87.5 13.4c-48.7 72-80 117-80 160.7s35.8 79.3 80 79.3s80-35.5 80-79.3s-31.3-88.8-80-160.7Z"><animateTransform additive="sum" attributeName="transform" calcMode="spline" dur="6s" keySplines=".42, 0, .58, 1; .42, 0, .58, 1" repeatCount="indefinite" type="scale" values="1 1; 1 .9; 1 1"/></path></symbol></defs><use width="175" height="260.9" href="#SVGsr3YqdGo" transform="translate(168.4 123.18)"/><path fill="#ffffff" d="M218.8 250.5q4.8-4.5 13.7-4.5t13.6 4.5q4.8 4.4 4.8 12.4v8q0 7.8-4.8 12.2t-13.6 4.4q-9 0-13.7-4.4t-4.8-12.2v-8q0-8 4.8-12.4Zm71.2-1.6a2.8 2.8 0 0 1-.6 2.6l-53 73.3a9.4 9.4 0 0 1-2.8 2.8a12.3 12.3 0 0 1-4.6.6h-4.4c-1.3 0-2.1-.4-2.5-1.1a2.8 2.8 0 0 1 .7-2.8l53-73.3a7 7 0 0 1 2.6-2.7a12.7 12.7 0 0 1 4.4-.5h4.9c1.2 0 2 .4 2.3 1.1Zm-57.5 7.6q-7.7 0-7.7 7v6.7q0 7 7.7 7t7.7-7v-6.8q0-6.9-7.7-6.9Zm33.4 36.4q4.7-4.5 13.7-4.5t13.6 4.5q4.8 4.5 4.8 12.4v8q0 7.8-4.8 12.2t-13.7 4.5q-8.9 0-13.6-4.4t-4.8-12.3v-8q0-8 4.8-12.4Zm13.6 6.1q-7.6 0-7.6 7v6.6q0 7 7.6 7t7.7-7v-6.7q0-6.9-7.7-6.9Z"/></svg>
            <p class="hourly__humidity">${Math.round(hour.rh2m )?? "--"}%</p>
          </div>
        </div>
      </div>
    `).join("");

    // loads the icons per hour
    day.hours.forEach((hour, index) => {
      const holder = this.shadowRoot.getElementById(`hourly-icon-${index}`);
      if (!holder) return;

      const weatherState = this.getWeatherState(hour.ghi, hour.tcc);
      const precipitationState = this.getWeatherPrecipitation(hour.mtpr, hour.mtsr);
      const stormState = this.getWeatherStorm(hour.storm_idx);

      const icon = this.getWeatherIcon(weatherState, precipitationState, stormState);
      holder.replaceChildren(icon);
    });
  }

  /**
   * 
   * @returns coordinates calculated by the browser's geolocation
   */
  getPosition() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  }

  /**
   * 
   * @param {*} lat 
   * @param {*} lon 
   * @returns the name of the closest city to the coordinates given
   */
  async getCityName(lat, lon) {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=default`;
    const res = await fetch(url);
    const data = await res.json();
    return data.city || data.locality || data.principalSubdivision;
  }



  /**
   * 
   * @param {*} celsius a temperature in celsius degrees   
   * @returns the temperature in fahrenheit degrees if useFahrenheit is true
   */
  formatTemperature(celsius) {
    if (celsius == null) return "--";
    return this.useFahrenheit
      ? `${Math.round(celsius * 9 / 5 + 32)}°F`
      : `${Math.round(celsius)}°C`;
  }

  /**
   * 
   * @param {*} ms a speed in meters per second
   * @returns the speed in miles per hour if useMph is true or kilometer per hour otherwise
   */
  formatSpeed(ms) {
    if (ms == null) return "--";
    const speed = this.useMph ? ms * 2.23694 : ms * 3.6;
    return `${Math.round(speed * 10) / 10}${this.useMph ? " mph" : " km/h"}`;
  }

  /**
   * 
   * @param {*} timeText a time from a formatted US date 
   * @returns a string with the time in 24h format  if use24h is true, a 12h format hour otherwise
   */
  formatTime(timeText) {
    if (!timeText) return "--";

    const match = timeText.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
    if (!match) return timeText;

    let hour = Number(match[1]);
    const minute = match[2];
    const period = match[3].toUpperCase();

    if (this.use24h) {
      if (period === "AM") {
        if (hour === 12) hour = 0;
      } else {
        if (hour !== 12) hour += 12;
      }
      return `${String(hour).padStart(2, "0")}:${minute}`;
    }

    return `${hour}:${minute} ${period}`;
  }

  /**
   * 
   * @param {*} mm a precipitation rate in millimeters
   * @returns the precipitation in inches if useInches is true, a rounded precipitation in millimeters otherwise
   */
  formatPrecipitation(mm) {
    if (mm == null) return "--";
    if (this.useInches) {
      return `${Math.round((mm / 25.4) * 100) / 100} in`;
    }
    return `${Math.round(mm * 10) / 10} mm`;
  }

  /**
   * Requests the data to the proxy 
   * @param {*} field the fields to get the API's data
   * @param {*} widgetToken the users token
   * @returns 
   */
  async getField(field) {
    const response = await fetch(
      `https://frogcastproxy.onrender.com/forecast?latitude=${this.latitude}&longitude=${this.longitude}&fields=${field}&widgetToken=${this.widgetToken}`
    );
    console.log(response);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    return await response.json();
  }

  
  /**
   * filters the data given to only get the data for the following dayAmount of days
   * @param {*} series list of data with timestamps
   * @param {*} days amount of days to filter by
   * @returns a list having only the data for the requested amount of days
   */
  filterByDayAmount(series, days = this.dayAmount) {
    if (!Array.isArray(series)) return [];

    const now = new Date();
    const startUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    ));

    const endUTC = new Date(startUTC);
    endUTC.setUTCDate(startUTC.getUTCDate() + days);

    return series
      .filter(item => {
        const timestamp = new Date(item.timestamp);
        return timestamp >= startUTC && timestamp < endUTC;
      })
      .map(item => item.value);
  }
  
  /**
   * 
   * @param {*} weatherData group of series regrouping all forecasted data with timestamps
   * @param {*} days amount of days to group
   * @returns the weather data grouped by days
   */
  groupForecastByDay(weatherData, days = this.dayAmount) {
    const t2m = weatherData?.t2m || [];
    const tcc = weatherData?.tcc || [];
    const mtpr = weatherData?.mtpr || [];
    const mtsr = weatherData?.mtsr || [];
    const ghi = weatherData?.ghi || [];
    const stormIdx = weatherData?.storm_idx || [];
    const mtpa = weatherData?.mtpa || [];
    const windSpeed = weatherData?.windSpeed || [];
    const windDirection = weatherData?.windDirection || [];

    const now = new Date();
    const startUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    ));

    const endUTC = new Date(startUTC);
    endUTC.setUTCDate(startUTC.getUTCDate() + days);

    const grouped = new Map();

    const mergeSeries = (series, keyName) => {
      series.forEach(({ timestamp, value }) => {
        const date = new Date(timestamp);
        if (date < startUTC || date >= endUTC) return;

        const key = date.toISOString().slice(0, 10);

        if (!grouped.has(key)) {
          grouped.set(key, {
            t2m: [],
            ghi: [],
            tcc: [],
            precip: [],
            snowRate: [],
            isStorm: [],
            mtpa: [],
            windSpeed: [],
            windDirection: []
          });
        }

        grouped.get(key)[keyName].push(value);
      });
    };

    mergeSeries(t2m, "t2m");
    mergeSeries(ghi, "ghi");
    mergeSeries(tcc, "tcc");
    mergeSeries(mtpr, "precip");
    mergeSeries(mtsr, "snowRate");
    mergeSeries(stormIdx, "isStorm");
    mergeSeries(mtpa, "mtpa");
    mergeSeries(windSpeed, "windSpeed");
    mergeSeries(windDirection, "windDirection");

    let lastMtpa = null;

    return [...grouped.entries()].map(([date, values], i) => {
      const currentMtpa = values.mtpa[values.mtpa.length - 1];

      const mtpa =
        i === 0 || lastMtpa == null
          ? currentMtpa
          : currentMtpa - lastMtpa;

      lastMtpa = currentMtpa;
      return {
        date,
        label:
          i === 0
            ? "Today"
            : new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
        min: values.t2m.length ? Math.round(Math.min(...values.t2m)) : null,
        max: values.t2m.length ? Math.round(Math.max(...values.t2m)) : null,
        t2m: values.t2m,
        ghi: values.ghi,
        tcc: values.tcc,
        precip: values.precip,
        snowRate: values.snowRate,
        isStorm: values.isStorm,
        mtpa, 
        windSpeed: values.windSpeed,
        windDirection: values.windDirection,
      };
    });
  }

/**
 * Groups the data by hour by day
 * @param {*} weatherData group of series regrouping all forecasted data with timestamps
 * @param {*} days the amount of days to group by
 * @returns 
 */
  groupHourlyByDay(weatherData, days = this.dayAmount) {
    const t2m = weatherData?.t2m || [];
    const rh2m = weatherData?.rh2m || [];
    const windSpeed = weatherData?.windSpeed || [];
    const windDirection = weatherData?.windDirection || [];
    const tcc = weatherData?.tcc || [];
    const mtpa = weatherData?.mtpa || [];
    const ghi = weatherData?.ghi || [];
    const mtpr = weatherData?.mtpr || [];
    const mtsr = weatherData?.mtsr || [];
    const stormIdx = weatherData?.storm_idx || [];
    const windGust = weatherData?.windGust || [];

    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + days);

    const grouped = new Map();

    const pushSeries = (series, field) => {
      series.forEach(({ timestamp, value }) => {
        const date = new Date(timestamp);
        if (date < start || date >= end) return;

        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

        if (!grouped.has(key)) grouped.set(key, []);

        const item = grouped.get(key);
        const hour = date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit"
        });

        let entry = item.find(h => h.time === hour);
        if (!entry) {
          entry = { time: hour };
          item.push(entry);
        }

        entry[field] = value;
      });
    };

    pushSeries(t2m, "t2m");
    pushSeries(rh2m, "rh2m");
    pushSeries(windSpeed, "windSpeed");
    pushSeries(windDirection, "windDirection");
    pushSeries(tcc, "tcc");
    pushSeries(mtpa, "mtpa");
    pushSeries(ghi, "ghi");
    pushSeries(mtpr, "mtpr");
    pushSeries(mtsr, "mtsr");
    pushSeries(stormIdx, "storm_idx");
    pushSeries(windGust, "windGust");

    return [...grouped.entries()].map(([dateKey, hours], i) => {
      hours.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      return {
        date: dateKey,
        label: i === 0 ? "Today" : new Date(dateKey).toLocaleDateString("en-US", { weekday: "short" }),
        hours
      };
    });
  }

  // gets data for the current hour
  filterByCurrentHour(series) {
    if (!Array.isArray(series)) return [];

    const currentHour = new Date().getHours();

    return series
      .filter(item => new Date(item.timestamp).getHours() === currentHour)
      .map(item => item.value);
  }

  getAverage(list) {
    if (!list.length) return null;
    return list.reduce((acc, value) => acc + value, 0) / list.length;
  }

  getDailyAverage(series, days = 1) {
    const values = this.filterByDayAmount(series, days);
    return this.getAverage(values);
  }
  


  // returns min and max for a given list of numbers
  getMinMaxFromList(values) {
    if (!values || !values.length) return [null, null];

    let min = values[0];
    let max = values[0];

    for (let i = 1; i < values.length; i++) {
      if (values[i] < min) min = values[i];
      if (values[i] > max) max = values[i];
    }

    return [min, max];
  }

  msToKmh(value) {
    return value * 3.6;
  }

  getForecastMinMax(series, days = this.dayAmount) {
    const values = this.filterByDayAmount(series, days);
    return this.getMinMaxFromList(values);
  }

  degreesToCardinal(deg) {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round(((deg % 360) / 45)) % 8;
    return directions[index];
  }

  setCurrentWeather() {
    const storm = this.filterByCurrentHour(this.weatherData.storm_idx)[0];
    const mtpr = this.filterByCurrentHour(this.weatherData.mtpr)[0];
    const mtsr = this.filterByCurrentHour(this.weatherData.mtsr)[0];
    const ghi = this.filterByCurrentHour(this.weatherData.ghi)[0];
    const tcc = this.filterByCurrentHour(this.weatherData.tcc)[0];

    const label =
      this.getWeatherStorm(storm) ||
      this.getWeatherPrecipitation(mtpr, mtsr) ||
      this.getWeatherState(ghi, tcc);

    this.shadowRoot.getElementById("current-weather").textContent =
      this.formatWeatherLabel(label);
  }

  formatWeatherLabel(label) {
    return label
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  getTemperature() {
    const data = this.weatherData?.t2m;
    const currentHourTemp = this.filterByCurrentHour(data);
    const currentHourHumidity = this.filterByCurrentHour(this.weatherData?.rh2m);
    const currentHourWindSpeed = this.filterByCurrentHour(this.weatherData?.windSpeed);

    if (!currentHourTemp.length) {
      this.shadowRoot.getElementById("temperature").textContent = "No data";
      return null;
    }

    const temp = currentHourTemp[0];
    this.shadowRoot.getElementById("temperature").textContent = `${this.formatTemperature(temp)}`;
    const apparentTemp = this.apparentTemperature(currentHourTemp[0], currentHourHumidity[0], currentHourWindSpeed[0]);
    this.shadowRoot.getElementById("apparent-temperature").textContent = `Apparent temperature ${this.formatTemperature(apparentTemp)}`;

    return temp;
  }

  getPrecipitation() {
    const data = this.weatherData?.mtpa;
    const currentDayData = this.filterByDayAmount(data, 1);

    if (!currentDayData.length) {
      this.shadowRoot.getElementById("current-precipitation").textContent = "No data";
      return null;
    }

    const precip = currentDayData[currentDayData.length-1];
    this.shadowRoot.getElementById("current-precipitation").textContent =
      `${this.formatPrecipitation(precip)}`;

    return precip;
  }

  getHumidity() {
    const data = this.weatherData?.rh2m;
    const currentHourData = this.filterByCurrentHour(data);

    if (!currentHourData.length) {
      this.shadowRoot.getElementById("humidity").textContent = "No data";
      return null;
    }

  }

  getWind() {
    const windSpeedData = this.weatherData?.windSpeed;
    const windDirectionData = this.weatherData?.windDirection;

    const dailyAverageSpeed = this.getDailyAverage(windSpeedData);
    const dailyAverageDirection = this.getDailyAverage(windDirectionData);
    
    if (!dailyAverageSpeed) {
      this.shadowRoot.getElementById("windSpeed").textContent = "No data";
      return null;
    }

    const windSpeed = this.msToKmh(dailyAverageSpeed);
    const windDirection = this.degreesToCardinal(dailyAverageDirection);

    this.shadowRoot.getElementById("current-wind").textContent =
      `${this.formatSpeed(dailyAverageSpeed)} ${windDirection}`;
    return {
      speed: windSpeed,
      direction: windDirection
    };
  }

  getCloudCover() {
    const data = this.weatherData?.tcc;
    const currentHourData = this.filterByCurrentHour(data);

    if (!currentHourData.length) {
      this.shadowRoot.getElementById("cloudCover").textContent = "No data";
      return null;
    }

    const cloud = currentHourData[0];
    return cloud;
  }

  getWeatherState(ghi, tcc) {
    const cloud = tcc * 100;

    if (ghi > 0) {
      if (cloud < 10) return "sunny";
      if (cloud <= 30) return "partly-cloudy";
      if (cloud <= 80) return "mostly-cloudy";
      return "overcast";
    } else {
      if (cloud < 10) return "clear-night";
      if (cloud <= 30) return "partly-cloudy-night";
      if (cloud <= 80) return "mostly-cloudy-night";
      return "overcast";
    }
  }
    
  getWeatherPrecipitation(mtpr, mtsr) {
    const hasRain = mtpr > 0.2;
    const hasHeavyRain = mtpr > 5;
    const hasSnow = mtsr > 0.2;

    if (hasRain && hasSnow) return "snow-and-rain";
    if (hasSnow) return "snow";
    if (hasHeavyRain) return "heavy-rain";
    if (hasRain) return "rain";
    return null;
  }

  getWeatherStorm(storm_idx) {
    const storms = {
      1: "light-thunderstorm",
      2: "moderate-thunderstorm",
      3: "severe-thunderstorm"
    };

    return storms[storm_idx] ?? null;
  }

  getWeatherIcon(weatherState, precipitationState, stormState) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 20 20");
    svg.setAttribute("class", "weather-icon");

    const layers = [];

    if (weatherState) {
      const sky = this.shadowRoot.getElementById(`icon-${weatherState}`);
      if (sky) layers.push(sky.cloneNode(true));
    }

    if (precipitationState) {
      const precip = this.shadowRoot.getElementById(`icon-${precipitationState}`);
      if (precip) layers.push(precip.cloneNode(true));
    }

    if (stormState) {
      const storm = this.shadowRoot.getElementById(`icon-${stormState}`);
      if (storm) layers.push(storm.cloneNode(true));
    }

    layers.forEach(layer => svg.appendChild(layer));
    return svg;
  }

  renderAll() {
    this.getTemperature();
    this.setCurrentWeather();
    this.getPrecipitation();
    this.getHumidity();
    this.getWind();
    this.getCloudCover();
    this.renderForecast();
    this.renderHourlyDetails(this.selectedDayIndex);
  }

  apparentTemperature(airTemperatureC, relativeHumidityPercent, windSpeedMps) {
    const vaporPressureHpa =
      (relativeHumidityPercent / 100) *
      6.105 *
      Math.exp((17.27 * airTemperatureC) / (237.7 + airTemperatureC));

    return airTemperatureC + 0.33 * vaporPressureHpa - 0.7 * windSpeedMps - 4.0;
  }
}

customElements.define("weather-widget", WeatherWidget);