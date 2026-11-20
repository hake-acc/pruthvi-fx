/**
 * Robert Borghesi - Selected Works 1:1 Pixel-Perfect Engine
 * Complete authentic replica from robertborghesi.is production source
 */

(function () {
    'use strict';

    const PROJECTS = [
    {
        "label": "//26",
        "client": "LAB",
        "title": "Gargantua",
        "key": "gargantua",
        "images": [
            {
                "key": "gargantua-1",
                "type": "texture",
                "path": "/lab/gargantua/og.jpg",
                "width": 1,
                "position": { "desktop": [0, 0], "mobile": [0, 0] },
                "url": "/lab/gargantua/og.jpg"
            }
        ],
        "awards": [],
        "link": "/lab/gargantua/"
    },
    {
        "label": "//26",
        "client": "LAB",
        "title": "Quidditch",
        "key": "quidditch",
        "images": [
            {
                "key": "quidditch-1",
                "type": "texture",
                "path": "/lab/quidditch/assets/og.jpg",
                "width": 1,
                "position": { "desktop": [0, 0], "mobile": [0, 0] },
                "url": "/lab/quidditch/assets/og.jpg"
            }
        ],
        "awards": [],
        "link": "/lab/quidditch/"
    },
    {
        "label": "//25",
        "client": "LAB",
        "title": "ASTRODITHER",
        "key": "astrodither",
        "images": [
            {
                "key": "astrodither-1",
                "type": "video",
                "path": "/images/gl/astrodither/1.mp4",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/astrodither/1.mp4"
            },
            {
                "key": "astrodither-2",
                "type": "texture",
                "path": "/images/gl/astrodither/2.jpg",
                "width": 0.38,
                "position": {
                    "desktop": [
                        -0.95,
                        -0.55
                    ],
                    "mobile": [
                        -0.2,
                        1.1
                    ]
                },
                "url": "/images/gl/astrodither/2.jpg"
            },
            {
                "key": "astrodither-3",
                "type": "texture",
                "path": "/images/gl/astrodither/3.jpg",
                "width": 0.37,
                "position": {
                    "desktop": [
                        0.9,
                        0.7
                    ],
                    "mobile": [
                        0.4,
                        -1.3
                    ]
                },
                "url": "/images/gl/astrodither/3.jpg"
            }
        ],
        "awards": [
            {
                "label": "FWA",
                "link": "https://thefwa.com/cases/astrodither"
            }
        ],
        "link": "https://astrodither.robertborghesi.is/"
    },
    {
        "label": "//24",
        "client": "LAB",
        "title": "Dracarys",
        "key": "dracarys",
        "images": [
            {
                "key": "dracarys-1",
                "type": "video",
                "path": "/images/gl/dracarys/1.mp4",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/dracarys/1.mp4"
            },
            {
                "key": "dracarys-2",
                "type": "video",
                "path": "/images/gl/dracarys/2.mp4",
                "width": 0.38,
                "position": {
                    "desktop": [
                        -1.08,
                        0.65
                    ],
                    "mobile": [
                        -0.2,
                        1.1
                    ]
                },
                "url": "/images/gl/dracarys/2.mp4"
            },
            {
                "key": "dracarys-3",
                "type": "video",
                "path": "/images/gl/dracarys/3.mp4",
                "width": 0.42,
                "position": {
                    "desktop": [
                        0.9,
                        -0.7
                    ],
                    "mobile": [
                        0.4,
                        -1.3
                    ]
                },
                "url": "/images/gl/dracarys/3.mp4"
            }
        ],
        "awards": [
            {
                "label": "FWA",
                "link": "https://thefwa.com/cases/dracarys"
            },
            {
                "label": "SOTD",
                "link": "https://www.awwwards.com/sites/dracarys"
            }
        ],
        "link": "https://dracarys.robertborghesi.is/"
    },
    {
        "label": "//24",
        "client": "OddCommon",
        "title": "OC#2",
        "key": "oc2",
        "images": [
            {
                "key": "oc2-1",
                "type": "video",
                "path": "/images/gl/oc2/1.mp4",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/oc2/1.mp4"
            },
            {
                "key": "oc2-2",
                "type": "video",
                "path": "/images/gl/oc2/2.mp4",
                "width": 0.32,
                "position": {
                    "desktop": [
                        1.05,
                        -0.65
                    ],
                    "mobile": [
                        -0.43,
                        1.4
                    ]
                },
                "url": "/images/gl/oc2/2.mp4"
            }
        ],
        "awards": [
            {
                "label": "FWA",
                "link": "https://thefwa.com/cases/oddcommon-website"
            },
            {
                "label": "SOTD",
                "link": "https://www.awwwards.com/sites/oddcommon-website"
            }
        ],
        "link": "https://www.oddcommon.com/"
    },
    {
        "label": "//22",
        "client": "Longines",
        "title": "Zulu",
        "key": "longines",
        "images": [
            {
                "key": "longines-1",
                "type": "video",
                "path": "/images/gl/longines/1.mp4",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/longines/1.mp4"
            },
            {
                "key": "longines-2",
                "type": "texture",
                "path": "/images/gl/longines/2.jpg",
                "width": 0.3,
                "position": {
                    "desktop": [
                        0.8,
                        1.05
                    ],
                    "mobile": [
                        0.55,
                        1.15
                    ]
                },
                "url": "/images/gl/longines/2.jpg"
            },
            {
                "key": "longines-3",
                "type": "texture",
                "path": "/images/gl/longines/3.jpg",
                "width": 0.35,
                "position": {
                    "desktop": [
                        -1.05,
                        -0.38
                    ],
                    "mobile": [
                        -0.65,
                        -0.95
                    ]
                },
                "url": "/images/gl/longines/3.jpg"
            }
        ],
        "awards": [
            {
                "label": "SOTD",
                "link": "https://www.awwwards.com/sites/zulu-longines"
            },
            {
                "label": "FWA",
                "link": "https://thefwa.com/cases/zulu-longines-p2"
            }
        ],
        "link": "https://www.longines.com/zulu/"
    },
    {
        "label": "//21",
        "client": "Google",
        "title": "Medusae Art Project",
        "key": "medusae",
        "images": [
            {
                "key": "medusae-1",
                "type": "video",
                "path": "/images/gl/medusae/1.mp4",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/medusae/1.mp4"
            },
            {
                "key": "medusae-2",
                "type": "texture",
                "path": "/images/gl/medusae/2.jpg",
                "width": 0.43,
                "position": {
                    "desktop": [
                        -1.05,
                        0.3
                    ],
                    "mobile": [
                        -0.25,
                        1.13
                    ]
                },
                "url": "/images/gl/medusae/2.jpg"
            },
            {
                "key": "medusae-3",
                "type": "video",
                "path": "/images/gl/medusae/3.mp4",
                "width": 0.38,
                "position": {
                    "desktop": [
                        0.85,
                        -0.95
                    ],
                    "mobile": [
                        0.45,
                        -1.2
                    ]
                },
                "url": "/images/gl/medusae/3.mp4"
            }
        ],
        "link": "https://experiments.withgoogle.com/medusae-climate-change"
    },
    {
        "label": "//19",
        "client": "Gucci",
        "title": "Horsebit",
        "key": "horsebit",
        "images": [
            {
                "key": "horsebit-1",
                "type": "texture",
                "path": "/images/gl/horsebit/1.jpg",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/horsebit/1.jpg"
            },
            {
                "key": "horsebit-2",
                "type": "texture",
                "path": "/images/gl/horsebit/2.jpg",
                "width": 0.3,
                "position": {
                    "desktop": [
                        -1.05,
                        0.3
                    ],
                    "mobile": [
                        -0.2,
                        1.1
                    ]
                },
                "url": "/images/gl/horsebit/2.jpg"
            },
            {
                "key": "horsebit-3",
                "type": "video",
                "path": "/images/gl/horsebit/3.mp4",
                "width": 0.45,
                "position": {
                    "desktop": [
                        0.9,
                        -0.7
                    ],
                    "mobile": [
                        0.4,
                        -1.3
                    ]
                },
                "url": "/images/gl/horsebit/3.mp4"
            }
        ],
        "awards": [
            {
                "label": "FWA",
                "link": "https://thefwa.com/cases/gucci-1955-horsebit-bag"
            }
        ],
        "link": "https://1955horsebit.gucci.com/"
    },
    {
        "label": "//22",
        "client": "Maya Lin",
        "title": "What is missing",
        "key": "wim",
        "images": [
            {
                "key": "wim-1",
                "type": "video",
                "path": "/images/gl/wim/1.mp4",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/wim/1.mp4"
            },
            {
                "key": "wim-2",
                "type": "video",
                "path": "/images/gl/wim/2.mp4",
                "width": 0.45,
                "position": {
                    "desktop": [
                        -0.8,
                        0.96
                    ],
                    "mobile": [
                        -0.2,
                        1.16
                    ]
                },
                "url": "/images/gl/wim/2.mp4"
            },
            {
                "key": "wim-3",
                "type": "texture",
                "path": "/images/gl/wim/3.jpg",
                "width": 0.45,
                "position": {
                    "desktop": [
                        1.05,
                        -0.85
                    ],
                    "mobile": [
                        0.36,
                        -1.25
                    ]
                },
                "url": "/images/gl/wim/3.jpg"
            }
        ],
        "awards": [
            {
                "label": "WEBBY//x3",
                "link": "https://winners.webbyawards.com/2023/websites-and-mobile-sites/features-design/best-navigationstructure/246279/what-is-missing"
            },
            {
                "label": "FWA",
                "link": "https://thefwa.com/cases/what-is-missing"
            }
        ],
        "link": "https://whatismissing.org/"
    },
    {
        "label": "//19",
        "client": "Gucci",
        "title": "Let Girls Dream",
        "key": "sitara",
        "images": [
            {
                "key": "sitara-1",
                "type": "video",
                "path": "/images/gl/sitara/1.mp4",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/sitara/1.mp4"
            },
            {
                "key": "sitara-2",
                "type": "video",
                "path": "/images/gl/sitara/3.mp4",
                "width": 0.45,
                "position": {
                    "desktop": [
                        0.9,
                        -0.65
                    ],
                    "mobile": [
                        -0.3,
                        -1.15
                    ]
                },
                "url": "/images/gl/sitara/3.mp4"
            },
            {
                "key": "sitara-3",
                "type": "texture",
                "path": "/images/gl/sitara/2.jpg",
                "width": 0.32,
                "position": {
                    "desktop": [
                        -0.95,
                        0.8
                    ],
                    "mobile": [
                        0.4,
                        1.26
                    ]
                },
                "url": "/images/gl/sitara/2.jpg"
            }
        ],
        "awards": [
            {
                "label": "FWA",
                "link": "https://thefwa.com/cases/let-girls-dream"
            },
            {
                "label": "SOTD",
                "link": "https://www.awwwards.com/sites/let-girls-dream"
            }
        ],
        "link": "https://www.letgirlsdream.org/"
    },
    {
        "label": "//21",
        "client": "Adidas",
        "title": "Secret Page",
        "key": "adidas",
        "images": [
            {
                "key": "adidas-1",
                "type": "video",
                "path": "/images/gl/adidas/1.mp4",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/adidas/1.mp4"
            },
            {
                "key": "adidas-2",
                "type": "video",
                "path": "/images/gl/adidas/3.mp4",
                "width": 0.5,
                "position": {
                    "desktop": [
                        1.05,
                        0.3
                    ],
                    "mobile": [
                        -0.43,
                        1.4
                    ]
                },
                "url": "/images/gl/adidas/3.mp4"
            },
            {
                "key": "adidas-3",
                "type": "texture",
                "path": "/images/gl/adidas/2.jpg",
                "width": 0.35,
                "position": {
                    "desktop": [
                        -0.85,
                        -0.8
                    ],
                    "mobile": [
                        0.23,
                        -1.26
                    ]
                },
                "url": "/images/gl/adidas/2.jpg"
            }
        ]
    },
    {
        "label": "//19",
        "client": "ONEOFF",
        "title": "ONE-OFF",
        "key": "oneoff",
        "images": [
            {
                "key": "oneoff-1",
                "type": "texture",
                "path": "/images/gl/oneoff/1.jpg",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/oneoff/1.jpg"
            },
            {
                "key": "oneoff-2",
                "type": "video",
                "path": "/images/gl/oneoff/2.mp4",
                "width": 0.4,
                "position": {
                    "desktop": [
                        -0.7,
                        0.9
                    ],
                    "mobile": [
                        -0.17,
                        1.3
                    ]
                },
                "url": "/images/gl/oneoff/2.mp4"
            },
            {
                "key": "oneoff-3",
                "type": "video",
                "path": "/images/gl/oneoff/3.mp4",
                "width": 0.35,
                "position": {
                    "desktop": [
                        0.6,
                        -0.9
                    ],
                    "mobile": [
                        0.2,
                        -1.14
                    ]
                },
                "url": "/images/gl/oneoff/3.mp4"
            }
        ],
        "link": "https://www.one-off.it/"
    },
    {
        "label": "//19",
        "client": "Gucci",
        "title": "24 Hour Ace",
        "key": "ace",
        "images": [
            {
                "key": "ace-1",
                "type": "video",
                "path": "/images/gl/ace/1.mp4",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/ace/1.mp4"
            },
            {
                "key": "ace-2",
                "type": "video",
                "path": "/images/gl/ace/2.mp4",
                "width": 0.35,
                "position": {
                    "desktop": [
                        -0.98,
                        0.5
                    ],
                    "mobile": [
                        0.14,
                        1.15
                    ]
                },
                "url": "/images/gl/ace/2.mp4"
            },
            {
                "key": "ace-3",
                "type": "texture",
                "path": "/images/gl/ace/3.jpg",
                "width": 0.25,
                "position": {
                    "desktop": [
                        -1.1,
                        -0.35
                    ],
                    "mobile": [
                        0.34,
                        -1.35
                    ]
                },
                "url": "/images/gl/ace/3.jpg"
            }
        ],
        "awards": [
            {
                "label": "FWA",
                "link": "https://thefwa.com/cases/24hourace"
            }
        ]
    },
    {
        "label": "//20",
        "client": "SAP",
        "title": "Power of Procurement",
        "key": "sap",
        "images": [
            {
                "key": "sap-1",
                "type": "video",
                "path": "/images/gl/sap/1.mp4",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/sap/1.mp4"
            },
            {
                "key": "sap-2",
                "type": "video",
                "path": "/images/gl/sap/2.mp4",
                "width": 0.35,
                "position": {
                    "desktop": [
                        1.1,
                        -0.45
                    ],
                    "mobile": [
                        0,
                        -1.15
                    ]
                },
                "url": "/images/gl/sap/2.mp4"
            }
        ],
        "awards": [
            {
                "label": "FWA",
                "link": "https://thefwa.com/cases/power-of-procurement-interactive-3d-tour"
            }
        ],
        "link": "https://demodern.com/projects/sap-virtual-3d-product-tour"
    },
    {
        "label": "//23",
        "client": "Metamask",
        "title": "Learn Metamask",
        "key": "metamask",
        "images": [
            {
                "key": "metamask-1",
                "type": "video",
                "path": "/images/gl/metamask/1.mp4",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/metamask/1.mp4"
            }
        ],
        "awards": [
            {
                "label": "WEBBY",
                "link": "https://winners.webbyawards.com/2024/websites-and-mobile-sites/features-design/best-practices/274522/metamask-learn"
            }
        ],
        "link": "https://learn.metamask.io/"
    },
    {
        "label": "//23",
        "client": "Web3://",
        "title": "AV0LVE",
        "key": "avolve",
        "images": [
            {
                "key": "avolve-1",
                "type": "video",
                "path": "/images/gl/avolve/1.mp4",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/avolve/1.mp4"
            },
            {
                "key": "avolve-2",
                "type": "texture",
                "path": "/images/gl/avolve/2.jpg",
                "width": 0.4,
                "position": {
                    "desktop": [
                        -1.05,
                        0.75
                    ],
                    "mobile": [
                        0.1,
                        1.25
                    ]
                },
                "url": "/images/gl/avolve/2.jpg"
            }
        ],
        "link": "https://www.av0lve.xyz/"
    },
    {
        "label": "//23",
        "client": "Web3://",
        "title": "FAIR",
        "key": "fair",
        "images": [
            {
                "key": "fair-1",
                "type": "texture",
                "path": "/images/gl/fair/1.jpg",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/fair/1.jpg"
            },
            {
                "key": "fair-2",
                "type": "video",
                "path": "/images/gl/fair/2.mp4",
                "width": 0.7,
                "position": {
                    "desktop": [
                        0.8,
                        0.3
                    ],
                    "mobile": [
                        0.1,
                        0.6
                    ]
                },
                "url": "/images/gl/fair/2.mp4"
            },
            {
                "key": "fair-3",
                "type": "video",
                "path": "/images/gl/fair/3.mp4",
                "width": 0.3,
                "position": {
                    "desktop": [
                        -0.75,
                        -0.5
                    ],
                    "mobile": [
                        -0.15,
                        -1.15
                    ]
                },
                "url": "/images/gl/fair/3.mp4"
            }
        ],
        "link": "https://fair.xyz/"
    },
    {
        "label": "//22",
        "client": "Web3://",
        "title": "Hypnotica",
        "key": "hypnotica",
        "images": [
            {
                "key": "hypnotica-1",
                "type": "video",
                "path": "/images/gl/hypnotica/1.mp4",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/hypnotica/1.mp4"
            },
            {
                "key": "hypnotica-2",
                "type": "texture",
                "path": "/images/gl/hypnotica/2.jpg",
                "width": 0.35,
                "position": {
                    "desktop": [
                        -1.05,
                        0.45
                    ],
                    "mobile": [
                        0.2,
                        1.25
                    ]
                },
                "url": "/images/gl/hypnotica/2.jpg"
            },
            {
                "key": "hypnotica-3",
                "type": "texture",
                "path": "/images/gl/hypnotica/3.jpg",
                "width": 0.28,
                "position": {
                    "desktop": [
                        0.63,
                        -0.92
                    ],
                    "mobile": [
                        -0.03,
                        -1.12
                    ]
                },
                "url": "/images/gl/hypnotica/3.jpg"
            }
        ],
        "link": "https://www.hypnotica.xyz/"
    }
];

    // Simplex Noise Shaders (A3 vertex, R3 fragment)
    const NOISE_VS = `varying vec2 vUv;
void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vUv = uv;
}`;

    const NOISE_FS = `precision highp float;
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

uniform float uRatio;
uniform float uColsFactorBig;
uniform float uColsFactorSmall;
uniform float uNoiseFactor;
varying vec2 vUv;

float calcNoise(float _ratio, float _colsFactor, float _noiseFactor) {
    float cols = 8.0 * _colsFactor;
    float rows = cols / _ratio;
    float x = ceil(vUv.x * cols);
    float y = floor((1.0 - vUv.y) * rows);
    return (snoise(vec2(x, y) * _noiseFactor) + 1.0) * 0.5;
}

void main() {
    float r = calcNoise(uRatio, uColsFactorBig, uNoiseFactor);
    float g = calcNoise(uRatio, uColsFactorSmall, uNoiseFactor);
    gl_FragColor = vec4(r, g, 0.0, 1.0);
}`;

    // Exact Mesh Shaders (x3 vertex, S3 fragment)
    const MESH_VS = `varying vec2 vUv;
void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vUv = uv;
}`;

    const MESH_FS = `precision highp float;
uniform float uProgressEnter;
uniform float uProgressEnterPixel;
uniform float uColsFactor;
uniform float uRatio;
uniform vec2 uUvScale;
uniform sampler2D uTxt;
uniform sampler2D uNoiseTxt;
varying vec2 vUv;

float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold - afwidth, threshold + afwidth, value);
}

void main() {
    #ifdef IS_BIG
        float noise = texture2D(uNoiseTxt, vUv).r;
    #else
        float noise = texture2D(uNoiseTxt, vUv).g;
    #endif

    float cols = 8.0 * uColsFactor;
    float rows = cols / uRatio;

    float alphaProg = uProgressEnter;
    float alpha = alphaProg <= 0.002 ? 0.0 : (1.0 - step(alphaProg, noise));
    float cut = 0.001;
    alpha *= aastep(cut, vUv.x);
    alpha *= 1.0 - aastep(1.0 - cut, vUv.x);
    alpha *= aastep(cut, vUv.y);
    alpha *= 1.0 - aastep(1.0 - cut, vUv.y);

    float np = floor(uProgressEnterPixel * 20.0) / 20.0;
    float pf = 20.0;
    float nc = mix(cols * 0.3, cols * pf, np);
    float nr = mix(rows * 0.3, rows * pf, np);

    vec2 puv = vec2(
        floor(vUv.x * nc + 0.5) / nc,
        floor(vUv.y * nr + 0.5) / nr
    );
    puv = mix(puv, vUv, smoothstep(0.9, 1.0, np));

    vec4 txt = texture2D(uTxt, (puv - 0.5) * uUvScale + 0.5);

    gl_FragColor = vec4(txt.rgb, alpha);
}`;

    // Presets from Robert Borghesi's source
    const PRESETS = [
        { colsFactor: 8, smallColsFactor: 4, noiseFactor: 0.071 },
        { colsFactor: 3, smallColsFactor: 3, noiseFactor: 0.071 },
        { colsFactor: 7, smallColsFactor: 3, noiseFactor: 0.055 },
        { colsFactor: 4, smallColsFactor: 3, noiseFactor: 0.045 }
    ];

    const P3 = n => Math.sin(0.3 * n - Math.cos(1 * n)) + Math.sin(0.4 * n + Math.cos(2 * n));

    // Global Preloaded Resource Store
    const RESOURCES = new Map();

    function preloadAllProjectAssets() {
        PROJECTS.forEach(project => {
            project.images.slice(0, 1).forEach(img => {
                if (RESOURCES.has(img.key)) return;

                if (img.type === 'video') {
                    const video = document.createElement('video');
                    video.width = 640;
                    video.height = 360;
                    video.loop = true;
                    video.muted = true;
                    video.playsInline = true;
                    video.preload = "auto";
                    video.crossOrigin = "anonymous";
                    video.style.display = "none";
                    video.src = img.url;
                    document.body.appendChild(video);

                    const tex = new THREE.VideoTexture(video);
                    tex.minFilter = THREE.LinearFilter;
                    tex.magFilter = THREE.LinearFilter;
                    tex.isVideoTexture = true;
                    tex.userData = { video };

                    video.addEventListener('canplay', () => {
                        tex.needsUpdate = true;
                    });
                    video.load();

                    RESOURCES.set(img.key, tex);
                } else {
                    const tex = new THREE.TextureLoader().load(img.url, (loaded) => {
                        loaded.needsUpdate = true;
                    });
                    tex.minFilter = THREE.LinearFilter;
                    tex.magFilter = THREE.LinearFilter;
                    tex.isVideoTexture = false;
                    RESOURCES.set(img.key, tex);
                }
            });
        });
    }

    class NoiseRTTGenerator {
        constructor(renderer, preset) {
            this.renderer = renderer;
            this.preset = preset;
            this.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 1, 1000);
            this.camera.position.z = 10;
            this.rtt = new THREE.WebGLRenderTarget(1024, 1024, { depthBuffer: false, stencilBuffer: false });
            
            const mat = new THREE.ShaderMaterial({
                vertexShader: NOISE_VS,
                fragmentShader: NOISE_FS,
                uniforms: {
                    uRatio: { value: 1.6 },
                    uColsFactorBig: { value: preset.colsFactor },
                    uColsFactorSmall: { value: preset.smallColsFactor },
                    uNoiseFactor: { value: preset.noiseFactor }
                }
            });
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
            this.renderer.setRenderTarget(this.rtt);
            this.renderer.render(mesh, this.camera);
            this.renderer.setRenderTarget(null);
            mat.dispose();
            mesh.geometry.dispose();
        }
        get texture() {
            return this.rtt.texture;
        }
    }

    class ProjectGroup extends THREE.Group {
        constructor(data, presetRtt, onRemoveCallback, row, sectionTop) {
            super();
            this.data = data;
            this.presetRtt = presetRtt;
            this.onRemoveCallback = onRemoveCallback;
            this.row = row;
            this.box = null;
            this.texture = null;
            this.meshes = [];
            this.videos = [];
            this.tl1 = gsap.timeline();
            this.tl2 = gsap.timeline();
            this.tweens = [];
            this.isLeaving = false;
            this.isLeavingFinal = false;
            this.visible = false;
            this.uuid = THREE.MathUtils.generateUUID();

            this.measure(sectionTop);
            this.init();
        }

        measure(sectionTop) {
            if (!this.row) return;
            const rowRect = this.row.getBoundingClientRect();
            const gap = this.row.querySelector('.projects__entry-gap');
            let left, width;
            const gapRect = gap ? gap.getBoundingClientRect() : null;
            if (gapRect && gapRect.width >= 40) {
                left = gapRect.left;
                width = gapRect.width;
            } else {
                width = rowRect.width * 0.85;
                left = rowRect.left + (rowRect.width - width) * 0.5;
            }
            this.box = { left, width, top: rowRect.top - sectionTop, height: rowRect.height };
        }

        mediaAspect() {
            const src = this.texture && this.texture.image;
            if (src) {
                const w = src.videoWidth || src.naturalWidth || 0;
                const h = src.videoHeight || src.naturalHeight || 0;
                if (w && h) return w / h;
            }
            return 16 / 10;
        }

        layout(sectionTop, vw, vh) {
            const b = this.box;
            const mesh = this.meshes[0];
            if (!b || !mesh) return;

            const aspect = this.mediaAspect();
            const w = b.width;
            const h = Math.min(w / aspect, vh * 0.7);
            const pad = 16;
            let cy = sectionTop + b.top + b.height * 0.5;
            if (h + pad * 2 < vh) cy = Math.min(Math.max(cy, h * 0.5 + pad), vh - h * 0.5 - pad);

            this.position.x = b.left + w * 0.5 - vw * 0.5;
            this.position.y = vh * 0.5 - cy;
            this.scale.set(w, h, 1);

            const u = mesh.material.uniforms;
            const meshRatio = w / h;
            u.uRatio.value = meshRatio;
            if (meshRatio > aspect) u.uUvScale.value.set(1, aspect / meshRatio);
            else u.uUvScale.value.set(meshRatio / aspect, 1);
        }

        init() {
            const { colsFactor } = this.presetRtt.preset;
            const noiseTex = this.presetRtt.texture;

            this.data.images.slice(0, 1).forEach((imgData) => {
                const cols = colsFactor;

                let texture = RESOURCES.get(imgData.key);
                let isVideo = imgData.type === 'video';

                if (!texture) {
                    if (isVideo) {
                        const video = document.createElement('video');
                        video.loop = true;
                        video.muted = true;
                        video.playsInline = true;
                        video.crossOrigin = 'anonymous';
                        video.src = imgData.url;
                        video.load();
                        texture = new THREE.VideoTexture(video);
                        texture.minFilter = THREE.LinearFilter;
                        texture.magFilter = THREE.LinearFilter;
                        texture.isVideoTexture = true;
                        texture.userData = { video };
                    } else {
                        texture = new THREE.TextureLoader().load(imgData.url);
                        texture.minFilter = THREE.LinearFilter;
                        texture.magFilter = THREE.LinearFilter;
                    }
                }

                if (isVideo && texture.userData && texture.userData.video) {
                    this.videos.push(texture.userData.video);
                }

                this.texture = texture;

                const mat = new THREE.ShaderMaterial({
                    vertexShader: MESH_VS,
                    fragmentShader: MESH_FS,
                    uniforms: {
                        uProgressEnter: { value: 0 },
                        uProgressEnterPixel: { value: 0 },
                        uTxt: { value: texture },
                        uColsFactor: { value: cols },
                        uRatio: { value: 16 / 10 },
                        uUvScale: { value: new THREE.Vector2(1, 1) },
                        uNoiseTxt: { value: noiseTex }
                    },
                    defines: {
                        DECODE_VIDEO_TEXTURE: isVideo,
                        IS_BIG: true
                    },
                    transparent: true,
                    depthTest: false,
                    depthWrite: false
                });

                const geom = new THREE.PlaneGeometry(1, 1);
                const mesh = new THREE.Mesh(geom, mat);
                mesh.userData.initialPosition = mesh.position.clone();

                this.meshes.push(mesh);
                this.add(mesh);
            });

            this.enter();
        }

        enter() {
            this.visible = true;
            this.tl1.clear();
            this.tl2.clear();

            this.videos.forEach(v => {
                v.currentTime = 0;
                const p = v.play();
                if (p !== undefined) p.catch(() => {});
            });

            const dur = 1.0;
            this.meshes.forEach((mesh, idx) => {
                const mat = mesh.material;
                if (idx === 0) {
                    this.tl1.to(mat.uniforms.uProgressEnter, { value: 1, duration: dur, ease: "power2.out" }, 0);
                    this.tl2.to(mat.uniforms.uProgressEnterPixel, { value: 1, duration: dur * 1.35, ease: "power1.in" }, 0);
                } else {
                    this.tweens.push(gsap.to(mat.uniforms.uProgressEnter, { value: 1, duration: dur, ease: "power2.out" }));
                    this.tweens.push(gsap.to(mat.uniforms.uProgressEnterPixel, { value: 1, duration: dur * 1.35, ease: "power1.in" }));
                }
            });

            if (this.onRemoveCallback) {
                this.tl1.call(this.onRemoveCallback, null, dur * 0.5);
            }
            this.tl1.restart();
            this.tl2.restart();
        }

        leaveSecondary() {
            if (this.isLeaving) return;
            this.isLeaving = true;
            this.tweens.forEach(t => t && t.kill());
            this.meshes.forEach((mesh, idx) => {
                if (idx > 0) {
                    const mat = mesh.material;
                    const cur = mat.uniforms.uProgressEnter.value;
                    this.tweens.push(gsap.to(mat.uniforms.uProgressEnter, { value: 0, duration: Math.max(0.12, cur * 0.4), ease: "power2.in" }));
                    this.tweens.push(gsap.to(mat.uniforms.uProgressEnterPixel, { value: 0, duration: Math.max(0.12, cur * 0.6), ease: "power1.out" }));
                }
            });
        }

        leaveAll(callback) {
            if (this.isLeavingFinal) return;
            this.isLeavingFinal = true;
            this.leaveSecondary();
            this.tl1.clear();
            this.tl2.clear();

            if (this.meshes.length > 0) {
                const mat = this.meshes[0].material;
                const cur = mat.uniforms.uProgressEnter.value;
                const dur = Math.max(0.15, cur * 0.45);
                this.tl1.to(mat.uniforms.uProgressEnter, { value: 0, duration: dur, ease: "power2.in" }, 0);
                this.tl2.to(mat.uniforms.uProgressEnterPixel, { value: 0, duration: dur * 1.2, ease: "power1.out" }, 0);
                gsap.delayedCall(dur + 0.02, () => {
                    this.videos.forEach(v => {
                        try { v.pause(); } catch(e) {}
                    });
                    if (callback) callback();
                });
            } else {
                if (callback) callback();
            }
        }

        leave(type, callback) {
            if (type === "last") {
                this.leaveSecondary();
            } else if (type === "all") {
                this.leaveAll(callback);
            }
        }

        animate(floatYArr, mouseSmooth) {
            this.meshes.forEach((mesh, i) => {
                const r = i;
                const s = (i + 1) % floatYArr.length;
                mesh.position.x = mesh.userData.initialPosition.x + floatYArr[r] * 0.01 + mouseSmooth.x * 0.02 * r;
                mesh.position.y = mesh.userData.initialPosition.y + floatYArr[s] * 0.01 + mouseSmooth.y * 0.02 * r;
            });
        }

        destroy() {
            this.tweens.forEach(t => t && t.kill());
            this.meshes.forEach(m => {
                if (m.material) m.material.dispose();
                if (m.geometry) m.geometry.dispose();
            });
            this.videos.forEach(v => {
                try {
                    v.pause();
                    v.removeAttribute('src');
                    v.load();
                } catch(e) {}
            });
            this.tl1.kill();
            this.tl2.kill();
        }
    }

    class RobertSelectedProjectsGL {
        constructor() {
            this.canvas = document.querySelector('#canvas');
            if (!this.canvas) {
                this.canvas = document.createElement('canvas');
                this.canvas.id = 'canvas';
                document.body.prepend(this.canvas);
            }
            this.canvas.style.display = 'none';
            this.canvas.style.opacity = '0';

            preloadAllProjectAssets();

            this.section = document.getElementById('section-projects');
            // Shares the section's stacking context so the media paints over the shrunk hero screen still in view
            // behind the first rows, and under the rows themselves
            if (this.section && this.section.parentNode) this.section.parentNode.insertBefore(this.canvas, this.section);
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                alpha: true,
                antialias: false,
                stencil: false,
                powerPreference: "high-performance"
            });
            this.renderer.setPixelRatio(window.__apPerf ? window.__apPerf.dpr(1.5) : Math.min(window.devicePixelRatio || 1, 1.5));
            window.addEventListener('ap:tier', () => this.renderer.setPixelRatio(window.__apPerf.dpr(1.5)));

            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(15, window.innerWidth / window.innerHeight, 1, 10000);
            this.camera.position.z = 10;

            this.contentGroup = new THREE.Group();
            this.contentGroup.rotation.order = "YXZ";
            this.scene.add(this.contentGroup);

            this.queueMap = new Map();
            this.lastEnterKey = null;
            this.presetProgress = 0;
            this.floatYArr = [0, 0, 0, 0];
            this.speed = 0;
            this.mouse = {
                target: { x: 0, y: 0 },
                smooth: { x: 0, y: 0 },
                prev: 0
            };
            this.clock = new THREE.Clock();
            this.timeElapsed = 0;
            this.vw = window.innerWidth;
            this.vh = window.innerHeight;

            this.initNoiseMaps();
            this.initAudio();
            this.initEvents();
            this.resize();

            this.animate = this.animate.bind(this);
            requestAnimationFrame(this.animate);
        }

        initNoiseMaps() {
            this.noisePresets = PRESETS.map(p => {
                return new NoiseRTTGenerator(this.renderer, p);
            });
        }

        initAudio() {
            this.tickAudio = new Audio('./audio/tick.mp3');
            this.tickAudio.volume = 0.45;
            let lastTickTime = 0;
            this.playTick = () => {
                const now = performance.now();
                if (now - lastTickTime < 75) return;
                lastTickTime = now;
                try {
                    this.tickAudio.currentTime = 0;
                    this.tickAudio.play().catch(() => {});
                } catch(e) {}
            };
        }

        initEvents() {
            window.addEventListener('resize', () => this.resize(), { passive: true });

            this.lastMouseX = null;
            this.lastMouseY = null;

            const section = document.getElementById('section-projects');
            const entries = Array.from(document.querySelectorAll('.projects__entry'));
            this.activeProjectRow = null;
            this.activeProjectIdx = -1;

            this.hoverDirty = false;
            this.lastHoverSectionTop = null;

            const updateMousePosition = (cx, cy) => {
                this.lastMouseX = cx;
                this.lastMouseY = cy;
                this.mouse.target.x = (cx / window.innerWidth) * 2 - 1;
                this.mouse.target.y = -(cy / window.innerHeight) * 2 + 1;
                this.hoverDirty = true;
            };

            this.isSectionInView = false;
            let leaveDebounceTimer = null;

            this.deactivateAllProjects = () => {
                if (this.activeProjectIdx === -1 && !this.activeProjectRow) return;
                this.activeProjectRow = null;
                this.activeProjectIdx = -1;

                entries.forEach((e) => {
                    e.classList.remove('h-mainOpacity--full');
                    e.classList.remove('is-hovered');
                });

                if (typeof gsap !== 'undefined') {
                    gsap.to('html', { '--mainOpacity': 1, duration: 0.25, ease: 'power1.out' });
                    if (this.renderer && this.renderer.domElement) {
                        gsap.to(this.renderer.domElement, { opacity: 0, duration: 0.25, ease: 'power1.out' });
                    }
                } else {
                    document.documentElement.style.setProperty('--mainOpacity', '1');
                    if (this.renderer && this.renderer.domElement) {
                        this.renderer.domElement.style.opacity = '0';
                    }
                }

                this.leaveProject("all");
            };

            this.activateProject = (targetIdx) => {
                if (targetIdx < 0 || targetIdx >= entries.length) return;
                const targetRow = entries[targetIdx];
                if (this.activeProjectIdx === targetIdx && this.activeProjectRow === targetRow) return;

                this.activeProjectRow = targetRow;
                this.activeProjectIdx = targetIdx;

                entries.forEach((e, idx) => {
                    if (idx === targetIdx) {
                        e.classList.add('h-mainOpacity--full');
                        e.classList.add('is-hovered');
                    } else {
                        e.classList.remove('h-mainOpacity--full');
                        e.classList.remove('is-hovered');
                    }
                });

                if (this.canvas) {
                    this.canvas.style.display = 'block';
                }

                if (typeof gsap !== 'undefined') {
                    gsap.to('html', { '--mainOpacity': 0.03, duration: 0.25 });
                    if (this.renderer && this.renderer.domElement) {
                        gsap.to(this.renderer.domElement, { opacity: 1, duration: 0.25 });
                    }
                } else {
                    document.documentElement.style.setProperty('--mainOpacity', '0.03');
                    if (this.renderer && this.renderer.domElement) {
                        this.renderer.domElement.style.opacity = '1';
                    }
                }

                this.playTick();

                this.presetProgress = targetIdx % this.noisePresets.length;
                const key = targetRow.getAttribute('data-project-key');
                if (key) this.enterProject(key, targetRow);
            };

            this.sectionFar = false;
            if (section && 'IntersectionObserver' in window) {
                const sc = document.querySelector('.js-scroller');
                new IntersectionObserver((es) => { this.sectionFar = !es[es.length - 1].isIntersecting; }, { root: sc && sc.contains(section) ? sc : null, rootMargin: '50% 0px' }).observe(section);
            }
            this.checkSectionBounds = () => {
                if (!section || !entries.length) return;

                const secRect = section.getBoundingClientRect();
                const winH = window.innerHeight;
                this.sectionTop = secRect.top;

                // Section is strictly in view if top < winH and bottom > 20 (before What We Do starts)
                const inView = secRect.top < winH && secRect.bottom > 20;

                if (!inView) {
                    if (this.isSectionInView) {
                        this.isSectionInView = false;
                        if (this.canvas) {
                            this.canvas.style.display = 'none';
                            this.canvas.style.opacity = '0';
                        }
                        this.deactivateAllProjects();
                    }
                    return;
                }

                if (!this.isSectionInView) {
                    this.isSectionInView = true;
                    if (this.canvas) {
                        this.canvas.style.display = 'block';
                    }
                }
            };

            const onPointerMove = (e) => {
                if (e.pointerType === 'touch') return;
                updateMousePosition(e.clientX, e.clientY);
            };

            const onPointerExitWindow = (e) => {
                if (e.relatedTarget) return;
                this.lastMouseX = null;
                this.lastMouseY = null;
                if (this.activeProjectIdx !== -1) onLeaveRow();
            };

            const markHoverDirty = () => {
                this.hoverDirty = true;
            };

            const moveEvent = 'PointerEvent' in window ? 'pointermove' : 'mousemove';
            window.addEventListener(moveEvent, onPointerMove, { passive: true });
            document.addEventListener('mouseout', onPointerExitWindow, { passive: true });
            window.addEventListener('scroll', markHoverDirty, { capture: true, passive: true });

            const scroller = document.querySelector('.js-scroller');
            if (scroller) {
                scroller.addEventListener('scroll', markHoverDirty, { passive: true });
            }

            const lenis = window.lenis || window.__lenis;
            if (lenis && typeof lenis.on === 'function') {
                lenis.on('scroll', markHoverDirty);
            }

            const onHoverRow = (idx) => {
                if (leaveDebounceTimer) {
                    clearTimeout(leaveDebounceTimer);
                    leaveDebounceTimer = null;
                }
                if (!this.isSectionInView) return;

                if (this.canvas) {
                    this.canvas.style.display = 'block';
                    this.canvas.style.opacity = '1';
                }
                this.activateProject(idx);
            };

            const onLeaveRow = () => {
                if (leaveDebounceTimer) clearTimeout(leaveDebounceTimer);
                leaveDebounceTimer = setTimeout(() => {
                    leaveDebounceTimer = null;
                    this.deactivateAllProjects();
                }, 120);
            };

            // Single hover source for pointer movement and scroll under a still pointer.
            // Must run after checkSectionBounds() and before any DOM writes in the frame.
            this.resolvePointerHover = () => {
                if (this.lastMouseX === null || !this.isSectionInView) {
                    this.lastHoverSectionTop = null;
                    return;
                }
                if (!this.hoverDirty && this.sectionTop === this.lastHoverSectionTop) return;
                this.hoverDirty = false;
                this.lastHoverSectionTop = this.sectionTop;

                const hit = document.elementFromPoint(this.lastMouseX, this.lastMouseY);
                const row = hit ? hit.closest('.projects__entry') : null;
                const idx = row ? entries.indexOf(row) : -1;

                if (idx !== -1) {
                    if (idx !== this.activeProjectIdx || leaveDebounceTimer) onHoverRow(idx);
                } else if (this.activeProjectIdx !== -1 && !leaveDebounceTimer) {
                    onLeaveRow();
                }
            };

            entries.forEach((row, idx) => {
                row.style.cursor = 'pointer';

                row.addEventListener('mouseenter', (e) => {
                    updateMousePosition(e.clientX, e.clientY);
                    this.isSectionInView = true;
                    onHoverRow(idx);
                });

                row.addEventListener('pointerenter', (e) => {
                    if (e.pointerType === 'touch') return;
                    updateMousePosition(e.clientX, e.clientY);
                    this.isSectionInView = true;
                    onHoverRow(idx);
                });

                row.addEventListener('mouseleave', () => {
                    onLeaveRow();
                });

                // Click row to launch project
                row.addEventListener('click', (e) => {
                    if (e.target.closest('a')) return;
                    const ctaLink = row.querySelector('.projects__entry-cta:not(.projects__entry-cta--github) a');
                    if (ctaLink && ctaLink.href) {
                        if (!ctaLink.target) ctaLink.click();
                        else window.open(ctaLink.href, '_blank');
                    }
                });
            });

            if (section) {
                section.addEventListener('pointerenter', (e) => {
                    if (e.pointerType === 'touch') return;
                    updateMousePosition(e.clientX, e.clientY);
                    this.isSectionInView = true;
                    this.hoverDirty = true;
                    this.resolvePointerHover();
                });
            }

            // Launch arrows: the box lights up and the pixel bug lands on it with its under-construction tag
            let ucOwner = null;
            let ucOff = null;
            const ucSummon = (btn) => {
                clearTimeout(ucOff);
                if (ucOwner && ucOwner !== btn) ucOwner.classList.remove('is-uc');
                btn.classList.add('is-uc');
                if (ucOwner === btn) return;
                ucOwner = btn;
                const box = btn.children[1];
                if (typeof window.__pixelBugLeash !== 'function') return;
                window.__pixelBugLeash(() => {
                    const r = box.getBoundingClientRect();
                    return { x: r.left + r.width * 0.5, y: r.top - r.height * 0.35, heading: Math.PI };
                }, {
                    onArrive: () => { if (ucOwner === btn && window.__pixelBugSay) window.__pixelBugSay('under construction'); }
                });
            };
            const ucRelease = (delay) => {
                clearTimeout(ucOff);
                ucOff = setTimeout(() => {
                    if (!ucOwner) return;
                    ucOwner.classList.remove('is-uc');
                    ucOwner = null;
                    if (window.__pixelBugLeash) window.__pixelBugLeash(null);
                    if (window.__pixelBugSay) window.__pixelBugSay('');
                }, delay);
            };
            section.querySelectorAll('.js-launch-uc').forEach((btn) => {
                btn.addEventListener('mouseenter', () => ucSummon(btn));
                btn.addEventListener('mouseleave', () => ucRelease(0));
                btn.addEventListener('focus', () => ucSummon(btn));
                btn.addEventListener('blur', () => ucRelease(400));
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    ucSummon(btn);
                    ucRelease(2600);
                });
                btn.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ucSummon(btn); ucRelease(2600); }
                });
            });

            window.addEventListener('resize', markHoverDirty, { passive: true });

            // Initial check once rendered
            setTimeout(() => this.checkSectionBounds(), 100);
        }

        enterProject(key, row) {
            const projectData = PROJECTS.find(p => p.key === key);
            if (!projectData) return;

            const prevId = this.lastEnterKey;
            if (prevId) {
                this.leaveProject("last");
            }

            // Immediately purge any older groups in the queue (beyond prevId)
            if (this.queueMap.size > 1) {
                const toRemove = [];
                this.queueMap.forEach((group, id) => {
                    if (id !== prevId) toRemove.push(id);
                });
                toRemove.forEach(id => this.removeItem(id));
            }

            const presetRtt = this.noisePresets[this.presetProgress];
            const secTop = this.section ? this.section.getBoundingClientRect().top : 0;
            const pGroup = new ProjectGroup(
                projectData,
                presetRtt,
                () => { if (prevId) this.removeItem(prevId); },
                row,
                secTop
            );
            pGroup.layout(secTop, this.vw, this.vh);

            this.queueMap.set(pGroup.uuid, pGroup);
            this.lastEnterKey = pGroup.uuid;
            this.contentGroup.add(pGroup);
        }

        leaveProject(type) {
            if (type === "all") {
                this.lastEnterKey = null;
                this.presetProgress = (this.presetProgress + 1) % this.noisePresets.length;
                this.queueMap.forEach((pGroup, id) => {
                    pGroup.leave("all", () => this.removeItem(id));
                });
            } else if (type === "last" && this.lastEnterKey && this.queueMap.has(this.lastEnterKey)) {
                this.queueMap.get(this.lastEnterKey).leave("last");
            }
        }

        removeItem(id) {
            if (this.queueMap.has(id)) {
                const group = this.queueMap.get(id);
                group.destroy();
                this.contentGroup.remove(group);
                this.queueMap.delete(id);
            }
        }

        resize() {
            const w = window.innerWidth;
            const h = window.innerHeight;
            this.renderer.setSize(w, h);

            const dist = (h / Math.tan(this.camera.fov * Math.PI / 360)) * 0.5;
            this.camera.position.z = dist;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();

            this.vw = w;
            this.vh = h;

            if (this.queueMap.size) {
                const secTop = this.section ? this.section.getBoundingClientRect().top : 0;
                this.queueMap.forEach(group => group.measure(secTop));
            }
        }

        animate() {
            requestAnimationFrame(this.animate);

            const delta = this.clock.getDelta();
            this.timeElapsed += delta;

            // Far from the section nothing is read or drawn; the observer wakes the bounds check on approach
            if (this.sectionFar && !this.isSectionInView && this.queueMap.size === 0) return;

            // Check section bounds
            if (this.checkSectionBounds) {
                this.checkSectionBounds();
                this.resolvePointerHover();
            }

            // Skip rendering when section is out of view and queue is empty
            if (!this.isSectionInView && this.queueMap.size === 0) {
                return;
            }

            // Lerp mouse
            this.mouse.smooth.x += (this.mouse.target.x - this.mouse.smooth.x) * 0.045;
            this.mouse.smooth.y += (this.mouse.target.y - this.mouse.smooth.y) * 0.045;
            this.speed = this.mouse.smooth.x - this.mouse.prev;
            this.mouse.prev = this.mouse.smooth.x;

            for (let i = 0; i < 4; i++) {
                this.floatYArr[i] = P3(this.timeElapsed * 0.5 + i);
            }

            // Each group is pinned to its row's gap cell; tilt stays small so the plane never leaves it
            const secTop = this.sectionTop || 0;
            this.queueMap.forEach(group => {
                group.layout(secTop, this.vw, this.vh);
                group.animate(this.floatYArr, this.mouse.smooth);
                group.rotation.y = this.mouse.smooth.x * 0.08;
                group.rotation.x = this.mouse.smooth.y * -0.05;
                group.rotation.z = this.speed * 0.3;
            });

            this.renderer.render(this.scene, this.camera);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { window.robertGL = new RobertSelectedProjectsGL(); });
    } else {
        window.robertGL = new RobertSelectedProjectsGL();
    }
})();
