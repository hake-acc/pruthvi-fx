import{St as e,et as t,g as n,it as r,n as i,tt as a}from"./app-zxjZQ-wy.js";import{r as o}from"./device-CmbjhLcW.js";import{t as s}from"./gsap-DSgSnfEt.js";import{t as c}from"./nav_item_icon-DmeHtg1-.js";var l=`#version 300 es
precision highp float;
in vec2 v_uv;

uniform float u_reveal_progress;
uniform vec2 u_content_dimensions;
uniform sampler2D u_content;
uniform vec2 u_size;


uniform float u_opacity;
uniform sampler2D u_input;
out vec4 FragColor;


vec2 imageCover(vec2 uv, vec2 imageDimensions) {
    vec2 st = uv;

    float containerRatio = u_size.x / u_size.y;
    float imageRatio = imageDimensions.x / imageDimensions.y;

    st.x /= max(1.0, imageRatio / containerRatio);
    st.y /= max(1.0, containerRatio / imageRatio);

    float y_difference = max(0.0, (containerRatio - imageRatio) / containerRatio);
    float x_difference = max(0.0, (imageRatio - containerRatio) / imageRatio);
    st.y += y_difference / 2.0;
    st.x += x_difference / 2.0;

    return st;
}

void main() {

    vec2 uv = v_uv;

    vec2 st = imageCover(uv, u_content_dimensions);


    vec4 content = texture(u_content, st) * u_opacity;

    content = u_reveal_progress * content + (1.0 - u_reveal_progress) * vec4(0.3);


    vec4 tex = texture(u_input, uv);

    vec4 blend = vec4(min(content.r + tex.r, 1.0), min(content.g + tex.g, 1.0), min(content.b + tex.b, 1.0), min(content.a + tex.a, 1.0));


    // ----------------------------------- Render -----------------------------------

    FragColor = blend;
}
`,u=class{GRID_SIZE=8;IS_LIGHT_VERSION=o;item;index;setActive;navIcon;cursor;title;role;line;navIconInstance;tl;isActive=!1;animating=!1;canvas;composer;memberItemLayer;selectedTheme;backdropContent;fallBackContent;backdropItem;section;theme;opacity=0;revealProgress=0;label;revealTl;constructor(e,t,n,r){this.item=e,this.index=t,this.setActive=n,this.composer=r,this.backdropContent=this.item.querySelector(`.js-member-backdrop-item`),this.fallBackContent=this.item.querySelector(`.js-fallback-image`),this.IS_LIGHT_VERSION&&this.backdropContent&&this.backdropContent.tagName===`VIDEO`&&(this.backdropContent=this.fallBackContent),this.navIcon=this.item.querySelector(`.js-nav-item-icon`),this.title=this.item.querySelector(`.js-text`),this.role=this.item.querySelector(`.js-role`),this.line=this.item.querySelector(`.js-line`),this.label=this.item.dataset.label,this.init()}init=()=>{this.navIcon&&(this.navIconInstance=new c(this.navIcon)),this.bindEvents(),this.createLayers()};enter=()=>{this.cursor=i.instances.get(`cursor`)};destroy=()=>{this.unbindEvents(),this.tl?.kill()};bindEvents=()=>{i.instances.get(`device`).hasTouch||this.item.addEventListener(`mouseenter`,this.handleMouseEnter)};unbindEvents=()=>{i.instances.get(`device`).hasTouch||this.item.removeEventListener(`mouseenter`,this.handleMouseEnter)};handleMouseEnter=()=>{this.setActive(this.index,!0)};createLayers=()=>{r(this.composer)&&(this.memberItemLayer=new a(this.composer,{type:`member_item_`+this.index,fragment:l,vertex:t,glFilter:this.composer?.gl.NEAREST,dimensions:[window.innerWidth,window.innerHeight],uniforms:[[`u_opacity`,{value:0}],[`u_resolution`,{value:[window.innerWidth,window.innerHeight]}],[`u_size`,{value:[window.innerWidth,window.innerHeight]}],[`u_content_dimensions`,{value:[window.innerWidth,window.innerHeight]}],[`u_content`,{value:{texture:-1}}],[`u_reveal_progress`,{value:0}]]}))};createBackdrop=async e=>{if(!this.backdropContent){e&&e();return}this.backdropItem?.destroy(),await new Promise(e=>{this.backdropItem=new n(this.backdropContent,()=>e(null))}),this.onLoad(e)};onLoad=e=>{e&&e(),this.memberItemLayer&&this.backdropItem&&this.backdropItem.texture&&(this.memberItemLayer.uniforms.set(`u_content_dimensions`,{value:[this.backdropItem.width,this.backdropItem.height]}),this.memberItemLayer.uniforms.set(`u_content`,{value:this.backdropItem.texture}),this.reveal())};reveal=()=>{this.revealTl?.kill(),this.revealTl=s.timeline(),this.revealTl.to(this,{revealProgress:1,onUpdate:()=>{this.memberItemLayer?.uniforms.set(`u_reveal_progress`,{value:this.revealProgress})}})};active=()=>{this.isActive||(this.isActive=!0,this.backdropItem||this.createBackdrop(),this.label&&i.instances.get(`cursorLabel`)?.add(this.label),!this.animating&&this.backdropContent instanceof HTMLVideoElement&&(this.backdropContent.currentTime=0),this.backdropContent instanceof HTMLVideoElement&&this.backdropContent.paused&&e(this.backdropContent),this.animating=!0,this.tl?.kill(),this.tl=s.timeline({onComplete:()=>{this.animating=!1}}),this.tl.add(()=>{this.navIconInstance?.show()},0),this.tl.to(this.title,{x:`1.125rem`,ease:`power4.out`,duration:.65},0),this.line&&this.tl.to(this.line,{scaleX:1,ease:`power4.out`,duration:.65},0),this.tl.to(this,{opacity:1,ease:`power4.out`,duration:.75,onUpdate:()=>{this.memberItemLayer?.uniforms.set(`u_opacity`,{value:this.opacity})},onComplete:()=>{this.memberItemLayer?.uniforms.set(`u_opacity`,{value:1})}},0))};inActive=()=>{this.isActive&&(this.isActive=!1,this.label&&i.instances.get(`cursorLabel`)?.hide(),this.animating=!0,this.tl?.kill(),this.tl=s.timeline({onComplete:()=>{this.animating=!1}}),this.tl.add(()=>{this.navIconInstance?.hide()},0),this.tl.to(this.title,{x:0,ease:`power4.out`,duration:.65},0),this.line&&this.tl.to(this.line,{scaleX:0,ease:`power4.out`,duration:.65},0),this.tl.to(this,{opacity:0,ease:`power4.out`,duration:.75,onUpdate:()=>{this.memberItemLayer?.uniforms.set(`u_opacity`,{value:this.opacity})},onComplete:()=>{this.memberItemLayer?.uniforms.set(`u_opacity`,{value:0})}},0))};render=({layer:e})=>{!this.animating&&!this.isActive||this.composer.step({layer:this.memberItemLayer,input:[{key:`u_input`,layer:e}],blendAlpha:!0,output:e})}};export{u as default};