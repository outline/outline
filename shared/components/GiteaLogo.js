// @flow
import * as React from 'react';

type Props = {
  size?: number,
  fill?: string,
  className?: string,
};

function GiteaLogo({ size = 34, fill = '#FFF', className }: Props) {
  return (
    <svg
            width={size}
            height={size}
            className={className}
            fill={fill}
          viewBox="0 0 135.46667 135.46667"
          version="1.1">
      <g
          id="layer1"
          transform="translate(0,-161.53334)"
          style={{display:"inline"}}>
          <path
              style={{
            fill: "#609926",
            fillOpacity: 1,
            stroke: "#428f29",
            strokeWidth: 1,
            strokeLinecap: "butt",
            strokeLinejoin: "miter",
            strokeOpacity: 1,
            strokeMitrelimit:4,
            strokeDasharray: "none",
              }}
              d="m 27.709937,195.15095 c -9.546573,-0.0272 -22.3392732,6.79805 -21.6317552,23.90397 1.105534,26.72889 25.4565952,29.20839 35.1916502,29.42301 1.068023,5.01357 12.521798,22.30563 21.001818,23.21667 h 37.15277 c 22.27763,-1.66785 38.9607,-75.75671 26.59321,-76.03825 -46.781583,2.47691 -49.995146,2.13838 -88.599758,0 -2.495053,-0.0266 -5.972321,-0.49474 -9.707935,-0.5054 z m 2.491319,9.45886 c 1.351378,13.69267 3.555849,21.70359 8.018216,33.94345 -11.382872,-1.50473 -21.069822,-5.22443 -22.851515,-19.10984 -0.950962,-7.4112 2.390428,-15.16769 14.833299,-14.83361 z"
              id="path3722"/>
    </g>
      <g
          id="layer2"
        style={{ display: "inline" }}>
          <rect
              style={{
                display: "inline",
                fill: "#fff",
                fillOpacity:1,
                stroke: "none",
                strokeWidth: "0.24757317px",
                strokeOpacity:1
              }}
              id="rect4599"
              width="34.762054"
              height="34.762054"
              x="87.508659"
              y="18.291576"
              transform="rotate(25.914715)"
              ry="5.4825778" />
          <path
              style={{
                display:"inline",
                fill:"#fff",
                fillOpacity:1,
                stroke: "none",
                strokeWidth: "0.26644793px",
                strokeLinecap:"butt",
                strokeLinejoin:"mitre",
                strokeOpacity:1
              }}
              d="m 79.804947,57.359056 3.241146,1.609954 V 35.255731 h -3.262698 z"
              id="path4525"/>
    </g>
      <g
          id="layer3"
        style={{ display: "inline" }}>
          <g
          style={{ display: "inline" }}
              id="g4539">
              <circle
                  transform="rotate(-19.796137)"
                  r="3.4745038"
                  cy="90.077766"
                  cx="49.064713"
                  id="path4606"
                  style={{
                    fill: "#609926",
                    fillOpacity:1,
                    stroke: "none",
                    strokeWidth:"0.26458332px",
                    strokeOpacity:1,
                  }} />
              <circle
                  transform="rotate(-19.796137)"
                  r="3.4745038"
                  cy="102.1049"
                  cx="36.810425"
                  id="path4606-3"
            style={{
              fill: "#609926",
              fillOpacity: 1,
              stroke: "none",
              strokeWidth: "0.26458332px",
              strokeOpacity: 1,
            }} />
              <circle
                  transform="rotate(-19.796137)"
                  r="3.4745038"
                  cy="111.43928"
                  cx="46.484283"
                  id="path4606-1"
                  style={{
                    fill: "#609926",
                    fillOpacity:1,
                    stroke: "none",
                    strokeWidth:"0.26458332px",
                    strokeOpacity:1,
                  }} />
              <rect
                  transform="rotate(26.024158)"
                  y="18.061695"
                  x="97.333458"
                  height="27.261492"
                  width="2.6726954"
                  id="rect4629-8"
                  style={{
                    fill: "#609926",
                    fillOpacity:1,
                    stroke: "none",
                    strokeWidth:"0.26458332px",
                    strokeOpacity:1,
                  }} />
              <path
          id="path4514"
          d="m 76.558096,68.116343 c 12.97589,6.395378 13.012989,4.101862 4.890858,20.907244"
            style={{
              fill:"none",
              stroke:"#609926",
              strokeWidth:"2.68000007",
              strokeLinecap:"butt",
              strokeLinejoin:"mitre",
              strokeOpacity:1,
              strokeDasharray:"none",
              strokeMitrelimit:4,
            }} />
      </g>
      </g>
  </svg>
  );
}

export default GiteaLogo;
