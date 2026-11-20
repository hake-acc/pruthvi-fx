import{Q as e,St as t,Z as n,dt as r,et as i,g as a,h as o,it as s,lt as c,n as l,nt as u,rt as d,tt as f,v as p,w as m,x as h}from"./app-DjHRamTc.js";import{a as g}from"./gsapConfig-BpbtjO5_.js";import{r as _}from"./device-C_vvxp1l.js";import{t as v}from"./gsap-CZbUZLV5.js";import{n as y}from"./colorTheme-BQNKdaP9.js";var b=`#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_input;
uniform float u_topProgress;
uniform float u_bottomProgress;
uniform vec2 u_resolution;
uniform float u_pixel_size;




out vec4 FragColor;


float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.98923445328, 4.137643425614414))) * 43758.54432453);
 }


float noise(vec2 p) {
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u*u*(3.0-2.0*u);

    float res = mix(
        mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
        mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), u.y);

    return res*res;
}

float checkEqual(float first, float second) {
    float difference = abs(first - second);
    float inverted_number = ceil(1.0 * difference / 20.0);

    return (1.0 - inverted_number);
}



float drawLLLogo(vec2 rect, float opacity, float full, float inverted, float yOffset) {


    float x = mod(round(mod(rect.x, 1.0) * 4.0 + 1.0 + 0.5), 4.0);
    float y = mod(round(mod(rect.y, 1.0) * 4.0 + 0.5 + yOffset), 4.0);

    float divider = (7.0 + 9.0 * full);
    float progress = 1.0 / divider;
    float inverted_offset = 16.0 * inverted;
    float offset = 0.0;

    float output_opacity = 0.0;

    // Opacity
    float block_1 = step(1.0 - opacity, progress * (abs(inverted_offset - 0.0) + offset));
    float block_2 = step(1.0 - opacity, progress * (abs(inverted_offset - 1.0) + offset));
    float block_3 = step(1.0 - opacity, progress * (abs(inverted_offset - 2.0) + offset));
    float block_4 = step(1.0 - opacity, progress * (abs(inverted_offset - 3.0) + offset));
    float block_5 = step(1.0 - opacity, progress * (abs(inverted_offset - 4.0) + offset));
    float block_6 = step(1.0 - opacity, progress * (abs(inverted_offset - 5.0) + offset));
    float block_7 = step(1.0 - opacity, progress * (abs(inverted_offset - 6.0) + offset));

    // Full
    float block_8 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 7.0) + offset));
    float block_9 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 8.0) + offset));
    float block_10 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 9.0) + offset));
    float block_11 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 10.0) + offset));
    float block_12 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 11.0) + offset));
    float block_13 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 12.0) + offset));
    float block_14 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 13.0) + offset));
    float block_15 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 14.0) + offset));
    float block_16 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 15.0) + offset));

    //
    output_opacity += block_1 * checkEqual(0.0, x) * checkEqual(0.0, y);
    output_opacity += block_2 * checkEqual(0.0, x) * checkEqual(2.0, y);
    output_opacity += block_3 * checkEqual(2.0, x) * checkEqual(1.0, y);
    output_opacity += block_4 * checkEqual(3.0, x) * checkEqual(3.0, y);
    output_opacity += block_5 * checkEqual(1.0, x) * checkEqual(3.0, y);
    output_opacity += block_6 * checkEqual(0.0, x) * checkEqual(1.0, y);
    output_opacity += block_7 * checkEqual(2.0, x) * checkEqual(0.0, y);

    // Full
    output_opacity += block_8 * checkEqual(0.0, x) * checkEqual(3.0, y);
    output_opacity += block_9 * checkEqual(1.0, x) * checkEqual(2.0, y);
    output_opacity += block_10 * checkEqual(3.0, x) * checkEqual(2.0, y);
    output_opacity += block_11 * checkEqual(3.0, x) * checkEqual(0.0, y);
    output_opacity += block_12 * checkEqual(2.0, x) * checkEqual(3.0, y);
    output_opacity += block_13 * checkEqual(2.0, x) * checkEqual(2.0, y);
    output_opacity += block_14 * checkEqual(1.0, x) * checkEqual(0.0, y);
    output_opacity += block_15 * checkEqual(1.0, x) * checkEqual(1.0, y);
    output_opacity += block_16 * checkEqual(3.0, x) * checkEqual(1.0, y);

    return min(1.0, output_opacity) * ceil(opacity);
}



void main() {

    float gap = 0.2;


    vec2 uv = v_uv;

    float columns = u_resolution.x / (u_pixel_size);
    float rows = u_resolution.y / (u_pixel_size);

    // grid is half offset top
    // here is centred
    float yOffset = 0.0;//0.5 - mod(rows, 1.0) / 2.0;

    float roundedX = round((uv.x) * columns) / columns;
    float roundedY = round((uv.y + (yOffset / 4.0 / rows)) * rows) / rows;


    // vec2 roundedUV = vec2(roundedX, roundedY);

    float xSmall = (round((uv.x) * columns * 4.0 - 0.5) + 0.5) / columns / 4.0;
    float ySmall = (round((uv.y + (yOffset / 4.0 / rows)) * rows * 4.0 - 0.5) + 0.5) / rows / 4.0;

    vec2 roundedUV = vec2(xSmall, ySmall);


    float noise_val = 0.5 * noise(roundedUV * 2.0 * 4.0);





    // float strength = 0.05;
    float strength = 0.15;
    roundedUV = vec2(roundedUV.x, roundedUV.y * (1.0 - strength * 2.0) + strength + strength * noise_val);



    // roundedUV.y += 0.1 * noise(roundedUV * 3.0 * 4.0);


    vec2 uv_resolution = vec2(uv.x * columns, uv.y * rows);
    // vec2 uv_resolution = vec2(roundedUV.x * columns, roundedUV.y * rows);


    float inverse = step(0.5, (uv.y - u_bottomProgress));

    // ----------------------------------- Opacity -----------------------------------

    float opacity = 0.0;


    // opacity = 1.0 - smoothstep((1.0 + gap) * u_logo_progress - gap, (1.0 + gap) * u_logo_progress, gh.y);
    // opacity = 1.0 - smoothstep((1.0 + gap) * u_topProgress - gap, (1.0 + gap) * u_topProgress, roundedUV.y);
    // opacity -= 1.0 - smoothstep((1.0 + gap) * u_bottomProgress - gap, (1.0 + gap) * u_bottomProgress, roundedUV.y);
    opacity = smoothstep((roundedUV.y * (1.0 - gap)) - gap, (roundedUV.y * (1.0 - gap)), u_topProgress - gap);
    opacity -= smoothstep((roundedUV.y * (1.0 - gap)) - gap, (roundedUV.y * (1.0 - gap)), u_bottomProgress - gap);


    float after_opacity = drawLLLogo(uv_resolution, opacity, 1.0, inverse, yOffset);
    vec4 tex = texture(u_input, uv);



    FragColor = vec4(tex.rgb, after_opacity);
}
`;v.registerPlugin(g);var x=class{IS_WEBGL=!0;IS_LIGHT_VERSION=_;GRID_SIZE=8;canvasKey=`canvas`;isDesktopContent=null;section;backdropContent;fallBackContent;theme;selectedTheme;canvas;fullWidth;fullHeight;cursor;gridLayer;sectionLayer;backdropItem;bottomProgress;topProgress;composer;topTl;bottomTl;inView=!1;nogrid=!1;paused=!1;scale=n?1:2;nogrid_progress=+!!n;videoEl;videoElMobile;revealTl;lazyLoading=!1;revealProgress=0;labels;scrollTrigger;logoTrigger;key;videoInstance;responsiveContent=!1;backdropContentItems;inViewPort=!1;logo;constructor(e){if(!window.__allBackdrops)window.__allBackdrops=[];window.__allBackdrops.push(this);this.section=e.parentNode,this.labels=e.dataset.labels?e.dataset.labels.split(`[/split/]`):[],e.dataset.labels&&e.removeAttribute(`data-labels`);let t=e.dataset.logo;if(this.logo=t&&t!==`logo`&&t in m?t:null,this.backdropContentItems=this.section.querySelectorAll(`.js-backdrop-item`),this.responsiveContent=this.backdropContentItems.length>1,this.backdropContent=this.getContent(),this.nogrid=!!this.backdropContent?.dataset.nogrid,this.fallBackContent=this.section.querySelector(`.js-fallback-image`),this.canvas=l.instances.get(`canvas`),this.key=[...this.section.classList].find(e=>e.match(`section--`))??``,!this.nogrid&&this.IS_LIGHT_VERSION&&this.backdropContent&&this.backdropContent.tagName===`VIDEO`&&(this.backdropContent=this.fallBackContent),(!this.canvas||!d())&&(this.IS_WEBGL=!1),this.IS_LIGHT_VERSION&&this.IS_WEBGL&&(this.IS_WEBGL=!this.nogrid),this.inViewPort=this.section.getBoundingClientRect().top<window.innerWidth,!this.IS_WEBGL&&this.nogrid){this.videoEl=this.section.querySelector(`.js-backdrop-video-item`),this.videoEl?.classList.remove(`opacity-0`),this.videoEl&&(!this.inViewPort||this.inViewPort&&this.responsiveContent&&window.innerWidth<1e3)&&this.createVideo(this.videoEl),this.videoElMobile=this.section.querySelector(`.js-backdrop-video-mobile-item`),this.videoElMobile?.classList.remove(`opacity-0`),this.videoElMobile&&(!this.inViewPort||this.inViewPort&&this.responsiveContent&&window.innerWidth>=1e3)&&this.createVideo(this.videoElMobile);return}this.theme=this.section.dataset.theme;let n=l.instances.get(`colorTheme`),r=n?.getTheme(),i=y.get(this.theme),a=this.theme===`none`||n?.getPageTheme()===this.theme;this.selectedTheme=a?r:i,this.IS_WEBGL&&a&&!this.backdropContent&&(this.IS_WEBGL=!1),this.topProgress=0,this.bottomProgress=0,this.init()}init=()=>{if(this.labels.length>0&&this.createLabelTrigger(),this.logo&&this.createLogoTrigger(),this.IS_WEBGL){if(this.createComposer(),!s(this.composer)){this.IS_WEBGL=!1;return}if(this.calculateSizes(),this.createLayers(),!this.gridLayer?.program||!this.sectionLayer?.program){this.gridLayer?.destroy(),this.sectionLayer?.destroy(),this.gridLayer=void 0,this.sectionLayer=void 0,this.IS_WEBGL=!1;return}this.createScrollTrigger()}};enter=()=>{this.IS_WEBGL&&(this.stepGrid(),this.cursor=l.instances.get(`cursor`),this.gridLayer.uniforms.set(`u_nocursor`,{value:+!this.cursor?.IS_WEBGL}),this.scale>1&&(v.to(this,{nogrid_progress:1,duration:1.95,ease:`power3.in`,delay:e+.15,onUpdate:()=>{this.gridLayer?.uniforms.set(`u_nogrid_progress`,{value:this.nogrid_progress})}}),v.to(this,{scale:1,duration:3.15,ease:`power4.out`,delay:e-.45,onUpdate:()=>{this.gridLayer?.uniforms.set(`u_scale`,{value:this.scale})}})))};resize=()=>{this.IS_WEBGL&&(this.calculateSizes(),this.gridLayer?.uniforms.set(`u_resolution`,{value:[window.innerWidth,window.innerHeight]}),this.gridLayer?.uniforms.set(`u_size`,{value:[window.innerWidth,window.innerHeight]}),this.gridLayer?.resize(this.fullWidth,this.fullHeight),this.sectionLayer?.uniforms.set(`u_resolution`,{value:[window.innerWidth,window.innerHeight]}),this.sectionLayer?.resize(this.fullWidth,this.fullHeight),this.stepGrid(),this.responsiveContent&&(window.innerWidth>=1e3&&!this.isDesktopContent||window.innerWidth<1e3&&this.isDesktopContent)&&this.refreshBackdrop())};load=()=>new Promise(e=>{if(!this.IS_WEBGL&&(!this.inViewPort||!this.backdropContent))e(null);else if(!this.IS_WEBGL&&this.inViewPort){let t=this.responsiveContent&&window.innerWidth<1e3?this.videoElMobile:this.videoEl;t&&this.createVideo(t,()=>{e(null)}),this.loadDelay(4,()=>e(null))}else{let inVP=this.section.getBoundingClientRect().top<window.innerHeight&&this.section.getBoundingClientRect().bottom>0;this.createBackdrop(!0,()=>e(null)),inVP?(this.canvas?.add(this),this.inView=!0):(this.inView=!1,this.sectionLayer?.uniforms?.set("u_topProgress",{value:-1})),this.loadDelay(4,()=>e(null))}});leave=()=>{this.IS_WEBGL&&(this.backdropItem&&this.backdropItem.leave(),this.canvasKey=h,this.composer.canvasKey=h)};destroy=()=>{this.canvas?.remove(this),this.videoInstance?.destroy(),this.topTl?.kill(),this.bottomTl?.kill(),this.revealTl?.kill(),this.scrollTrigger?.kill(),this.logoTrigger?.kill(),this.IS_WEBGL&&(this.gridLayer?.destroy(),this.sectionLayer?.destroy(),this.backdropItem?.destroy(),this.composer?.destroy())};createComposer=()=>{this.composer=new u({zIndex:2})};createLayers=()=>{s(this.composer)&&(this.gridLayer=new f(this.composer,{type:`backdrop_theme_grid_`+this.key,vertex:i,fragment:o,dimensions:[this.fullWidth,this.fullHeight],glFilter:this.composer.gl.NEAREST,numBuffers:1,uniforms:[[`u_transparent`,{value:0}],[`u_resolution`,{value:[window.innerWidth,window.innerHeight]}],[`u_size`,{value:[window.innerWidth,window.innerHeight]}],[`u_pixel_size`,{value:this.GRID_SIZE}],[`u_reveal_progress`,{value:+!this.backdropContent}],[`u_theme`,{value:[0,0,0]}],[`u_content_theme`,{value:this.selectedTheme?[this.selectedTheme.contentRGB.r,this.selectedTheme.contentRGB.g,this.selectedTheme.contentRGB.b]:[0,0,0]}],[`u_cursor_theme`,{value:this.selectedTheme?[this.selectedTheme.cursorRGB.r,this.selectedTheme.cursorRGB.g,this.selectedTheme.cursorRGB.b]:[0,0,0]}],[`u_content_dimensions`,{value:[window.innerWidth,window.innerHeight]}],[`u_content`,{value:{texture:-1}}],[`u_render_content`,{value:+!!this.backdropContent}],[`u_nogrid`,{value:0}],[`u_nogrid_progress`,{value:this.nogrid_progress}],[`u_nocursor`,{value:+!this.cursor?.IS_WEBGL}],[`u_distort_content`,{value:0}],[`u_scale`,{value:this.scale}],[`u_mirror`,{value:0}]]}),this.sectionLayer=new f(this.composer,{type:`backdrop_theme_section_`+this.key,vertex:i,fragment:b,dimensions:[this.fullWidth,this.fullHeight],uniforms:[[`u_topProgress`,{value:-1}],[`u_bottomProgress`,{value:-1}],[`u_resolution`,{value:[window.innerWidth,window.innerHeight]}],[`u_pixel_size`,{value:this.GRID_SIZE}]]}))};createVideo=(e,t=null)=>{e&&(this.videoInstance=new p(e,t))};calculateSizes=()=>{this.fullWidth=window.innerWidth*c,this.fullHeight=window.innerHeight*c};createScrollTrigger=()=>{let scrollerEl=document.querySelector(`.ll-scroller`)||window;this.topTl?.kill(),this.topTl=v.timeline({scrollTrigger:{trigger:this.section,scroller:scrollerEl,scrub:!0,start:`top bottom`,end:`top top`,onEnter:()=>{this.lazyLoading&&!this.backdropItem&&this.createBackdrop(),this.inView=!0,this.canvas?.add(this);let vid=this.backdropContent?.querySelector(`video`);vid&&vid.paused&&vid.play().catch(()=>{})},onLeaveBack:()=>{this.inView=!1,this.canvas?.remove(this),this.sectionLayer?.uniforms?.set(`u_topProgress`,{value:-1});let vid=this.backdropContent?.querySelector(`video`);vid&&!vid.paused&&vid.pause()}}}),this.topTl.fromTo(this,{topProgress:0},{topProgress:1,ease:`none`,onUpdate:()=>{this.sectionLayer.uniforms?.set(`u_topProgress`,{value:this.topProgress?this.topProgress:-1})}}),this.bottomTl?.kill(),this.bottomTl=v.timeline({scrollTrigger:{trigger:this.section,scroller:scrollerEl,scrub:!0,start:`bottom bottom`,end:`bottom top`,onEnterBack:()=>{this.inView=!0,this.canvas?.add(this);let vid=this.backdropContent?.querySelector(`video`);vid&&vid.paused&&vid.play().catch(()=>{})},onLeave:()=>{this.inView=!1,this.canvas?.remove(this),this.sectionLayer?.uniforms?.set(`u_bottomProgress`,{value:1});let vid=this.backdropContent?.querySelector(`video`);vid&&!vid.paused&&vid.pause()}}}),this.bottomTl.fromTo(this,{bottomProgress:0},{bottomProgress:1,ease:`none`,onUpdate:()=>{this.sectionLayer.uniforms?.set(`u_bottomProgress`,{value:this.bottomProgress?this.bottomProgress:-1})}})};createBackdrop=async(e=!1,n)=>{if(!this.backdropContent){n&&n();return}this.backdropItem?.destroy(),this.backdropContent=this.getContent();let r=this.backdropContent.querySelector(`video`);r&&r.paused&&t(r),await new Promise(e=>{this.backdropItem=new a(this.backdropContent,()=>e(null),!0)}),this.gridLayer&&this.backdropItem&&this.backdropItem.texture&&(this.gridLayer.uniforms.set("u_content",{value:this.backdropItem.texture}),this.gridLayer.uniforms.set("u_content_dimensions",{value:[this.backdropItem.width,this.backdropItem.height]}),this.gridLayer.uniforms.set("u_render_content",{value:1}),this.gridLayer.uniforms.set("u_reveal_progress",{value:1}),this.sectionLayer?.uniforms?.set("u_topProgress",{value:this.inView?(this.topProgress||0):-1}),this.sectionLayer?.uniforms?.set("u_bottomProgress",{value:-1})),this.inView&&this.canvas?.add(this),this.onLoad(e,n)};refreshBackdrop=()=>{this.createBackdrop(!0)};createLabelTrigger=()=>{let scrollerEl=document.querySelector(`.ll-scroller`)||window;this.scrollTrigger?.kill(),this.scrollTrigger=new g({trigger:this.section,scroller:scrollerEl,start:`top 50%`,end:`bottom 50%`,onEnter:()=>{l.instances.get(`headerMessage`)?.add(this.labels)},onEnterBack:()=>{l.instances.get(`headerMessage`)?.add(this.labels)},onLeave:()=>{l.instances.get(`headerMessage`)?.hide(this.labels)},onLeaveBack:()=>{l.instances.get(`headerMessage`)?.hide(this.labels)}})};createLogoTrigger=()=>{let scrollerEl=document.querySelector(`.ll-scroller`)||window;this.logoTrigger=g.create({trigger:this.section,scroller:scrollerEl,start:`top 45%`,end:`bottom 55%`,onEnter:()=>{l.instances.get(`headerIcon`)?.set(this.logo)},onEnterBack:()=>{l.instances.get(`headerIcon`)?.set(this.logo)},onLeave:()=>{l.instances.get(`headerIcon`)?.hide()},onLeaveBack:()=>{l.instances.get(`headerIcon`)?.hide()}})};loadDelay=(e=5,t)=>{setTimeout(()=>{t()},e*1e3)};onLoad=(e=!1,t)=>{t&&t(),this.gridLayer&&this.backdropItem&&this.backdropItem.texture&&(this.gridLayer.uniforms.set(`u_content_dimensions`,{value:[this.backdropItem.width,this.backdropItem.height]}),this.gridLayer.uniforms.set(`u_content`,{value:this.backdropItem.texture}),this.gridLayer.uniforms.set(`u_nogrid`,{value:+!!this.nogrid}),e?(this.revealProgress=1,this.gridLayer.uniforms.set(`u_reveal_progress`,{value:1})):this.reveal())};reveal=()=>{this.revealTl?.kill(),this.revealTl=v.timeline(),this.revealTl.to(this,{revealProgress:1,onUpdate:()=>{this.gridLayer?.uniforms.set(`u_reveal_progress`,{value:this.revealProgress})}})};getContent=()=>(this.isDesktopContent=window.innerWidth>=1e3,this.backdropContentItems.length===1||window.innerWidth>=1e3?this.backdropContentItems[0]:this.backdropContentItems[1]);canUseWebGL=()=>this.IS_WEBGL&&r(this.composer?.gl)&&!!this.gridLayer?.program&&!!this.sectionLayer?.program;stepGrid=()=>{this.canUseWebGL()&&this.composer?.step({layer:this.gridLayer,input:[{key:`u_cursor`,layer:this.cursor?.advectionLayer}],output:this.gridLayer})};render=({time:e})=>{!this.inView||this.paused||!this.canUseWebGL()||(this.gridLayer.uniforms.set(`u_time`,{value:e}),(this.backdropItem||this.cursor?.animating)&&this.stepGrid(),this.composer?.step({layer:this.sectionLayer,input:[{key:`u_input`,layer:this.gridLayer}],blendAlpha:!0}))}};export{x as default};