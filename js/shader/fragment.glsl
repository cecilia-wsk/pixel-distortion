uniform float uTime;
uniform sampler2D uTexture;
uniform vec4 uResolution;
uniform sampler2D uDataTexture;

varying vec2 vUv;
varying vec3 vPosition;

float PI = 3.141592653589793238;

void main()	{
	vec2 newUv = (vUv - vec2(0.5))*uResolution.zw + vec2(0.5);
	
	vec4 color = texture2D(uTexture,newUv);
	vec4 offset = texture2D(uDataTexture,vUv);

	gl_FragColor = vec4(vUv,0.0,1.);
	gl_FragColor = vec4(offset.r,0.,0.,1.);
	gl_FragColor = color;
	gl_FragColor = texture2D(uTexture,newUv - 0.02*offset.rg);

}