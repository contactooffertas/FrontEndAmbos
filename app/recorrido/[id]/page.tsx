"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MapPin, Navigation, Store, Bus, Footprints, ExternalLink } from "lucide-react";
import "../../styles/recorrido.css";

type Point={lat:number;lng:number};
type RouteData={coordinates:[number,number][];distance:number;duration:number};

declare global { interface Window { L:any } }

const haversine=(a:Point,b:Point)=>{
  const R=6371000,rad=(v:number)=>v*Math.PI/180,dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng);
  const x=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
};

function loadLeaflet(){
  return new Promise<any>((resolve,reject)=>{
    if(window.L)return resolve(window.L);
    if(!document.querySelector('link[data-rm-leaflet]')){
      const link=document.createElement("link");link.rel="stylesheet";link.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";link.dataset.rmLeaflet="1";document.head.appendChild(link);
    }
    const existing=document.querySelector('script[data-rm-leaflet]') as HTMLScriptElement|null;
    if(existing){existing.addEventListener("load",()=>resolve(window.L),{once:true});existing.addEventListener("error",reject,{once:true});return;}
    const script=document.createElement("script");script.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";script.dataset.rmLeaflet="1";script.onload=()=>resolve(window.L);script.onerror=reject;document.head.appendChild(script);
  });
}

export default function RecorridoPage(){
  const params=useParams<{id:string}>(),router=useRouter(),search=useSearchParams();
  const destination=useMemo<Point|null>(()=>{
    const lat=Number(search.get("lat")),lng=Number(search.get("lng"));
    return Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng}:null;
  },[search]);
  const name=search.get("name")||"Negocio";
  const [user,setUser]=useState<Point|null>(null),[route,setRoute]=useState<RouteData|null>(null);
  const [status,setStatus]=useState("Buscando tu ubicación…");
  const [mode,setMode]=useState<"walk"|"bus">("walk");
  const watchRef=useRef<number|null>(null),mapEl=useRef<HTMLDivElement|null>(null),mapRef=useRef<any>(null);
  const userMarker=useRef<any>(null),destMarker=useRef<any>(null),routeLayer=useRef<any>(null),firstFit=useRef(true);
  const lastRoutedPoint=useRef<Point|null>(null);

  useEffect(()=>{
    if(!destination){setStatus("Este negocio todavía no tiene ubicación cargada.");return;}
    if(!navigator.geolocation){setStatus("Tu dispositivo no permite obtener la ubicación.");return;}
    watchRef.current=navigator.geolocation.watchPosition(
      p=>{setUser({lat:p.coords.latitude,lng:p.coords.longitude});setStatus("Ubicación en vivo");},
      ()=>setStatus("Necesitamos permiso de ubicación para mostrar el recorrido."),
      {enableHighAccuracy:true,maximumAge:3000,timeout:15000}
    );
    return()=>{if(watchRef.current!==null)navigator.geolocation.clearWatch(watchRef.current)};
  },[destination]);

  useEffect(()=>{
    if(!user||!destination)return;
    // Keep the blue GPS marker live, but only ask the routing service again
    // after a meaningful displacement. This avoids route requests caused by
    // normal GPS jitter while the person is standing still.
    const previous=lastRoutedPoint.current;
    if(previous && haversine(previous,user)<25)return;
    lastRoutedPoint.current=user;

    const controller=new AbortController();
    const url=`https://routing.openstreetmap.de/routed-foot/route/v1/driving/${user.lng},${user.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`;
    fetch(url,{signal:controller.signal}).then(x=>x.ok?x.json():Promise.reject(new Error("route")))
      .then(data=>{const x=data?.routes?.[0];if(x)setRoute({coordinates:x.geometry.coordinates,distance:x.distance,duration:x.duration})})
      .catch(()=>{const d=haversine(user,destination);setRoute({coordinates:[[user.lng,user.lat],[destination.lng,destination.lat]],distance:d,duration:d/1.3})});
    return()=>controller.abort();
  },[user?.lat,user?.lng,destination?.lat,destination?.lng]);

  useEffect(()=>{
    if(!mapEl.current||!destination)return;
    let cancelled=false;
    loadLeaflet().then(L=>{
      if(cancelled||!mapEl.current)return;
      if(!mapRef.current){
        mapRef.current=L.map(mapEl.current,{zoomControl:true,attributionControl:true}).setView([destination.lat,destination.lng],16);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(mapRef.current);
        destMarker.current=L.circleMarker([destination.lat,destination.lng],{radius:10,color:"#fff",weight:4,fillColor:"#f97316",fillOpacity:1}).addTo(mapRef.current).bindTooltip(name,{permanent:true,direction:"top",offset:[0,-12]});
      }
      setTimeout(()=>mapRef.current?.invalidateSize(),50);
    }).catch(()=>setStatus("No pudimos cargar el mapa."));
    return()=>{cancelled=true};
  },[destination?.lat,destination?.lng,name]);

  useEffect(()=>{
    const L=window.L,map=mapRef.current;if(!L||!map||!user||!destination)return;
    if(!userMarker.current)userMarker.current=L.circleMarker([user.lat,user.lng],{radius:9,color:"#fff",weight:4,fillColor:"#2563eb",fillOpacity:1}).addTo(map).bindTooltip("Vos",{permanent:true,direction:"top",offset:[0,-10]});
    else userMarker.current.setLatLng([user.lat,user.lng]);
    if(routeLayer.current){map.removeLayer(routeLayer.current);routeLayer.current=null}
    if(route?.coordinates?.length){
      const latlngs=route.coordinates.map(([lng,lat])=>[lat,lng]);
      routeLayer.current=L.polyline(latlngs,{color:"#f97316",weight:6,opacity:.95,lineCap:"round",lineJoin:"round"}).addTo(map);
      if(firstFit.current){map.fitBounds(routeLayer.current.getBounds(),{padding:[38,38],maxZoom:17});firstFit.current=false}
    }
  },[user,route,destination]);

  useEffect(()=>()=>{if(mapRef.current){mapRef.current.remove();mapRef.current=null}},[]);

  const meters=route?.distance??(user&&destination?haversine(user,destination):0),near=meters>0&&meters<=300;
  const distanceLabel=meters<1000?`${Math.round(meters)} m`:`${(meters/1000).toFixed(1)} km`;
  const minutes=Math.max(1,Math.round((route?.duration||meters/1.3)/60));

  const comoLlegoUrl=user&&destination?`https://www.google.com/maps/dir/?api=1&origin=${user.lat},${user.lng}&destination=${destination.lat},${destination.lng}&travelmode=transit`:"";

  return <main className="route-page">
    <header className="route-header"><button onClick={()=>router.back()} aria-label="Volver"><ArrowLeft/></button><div><strong>Cómo llegar</strong><span>{name}</span></div></header>
    <div className="route-mode-tabs"><button className={mode==="walk"?"active":""} onClick={()=>setMode("walk")}><Footprints size={17}/> Caminando</button><button className={mode==="bus"?"active":""} onClick={()=>setMode("bus")}><Bus size={17}/> Colectivo</button></div>
    <section className="route-map"><div ref={mapEl} className="route-leaflet"/><div className="route-live"><Navigation size={14}/>{status}</div><div className="route-map-note">{mode==="walk"?"Ruta peatonal · ubicación en vivo":"Destino y ubicación listos"}</div></section>
    <section className="route-sheet">
      <div className="route-title"><div className="route-store-icon"><Store/></div><div><h1>{name}</h1><p><MapPin size={14}/> destino seleccionado</p></div></div>
      {user&&destination&&mode==="walk"&&<><div className="route-stats"><div><b>{distanceLabel}</b><span>distancia restante</span></div><div><b>~{minutes} min</b><span>caminando</span></div></div><div className={near?"route-near active":"route-near"}>{near?<><b>¡Estás cerca!</b><span>{name} está a {distanceLabel}.</span></>:<><b>Seguí acercándote</b><span>La ruta se actualiza con tu ubicación. Te avisamos al entrar en 300 m.</span></>}</div></>}
      {user&&destination&&mode==="bus"&&<div className="route-transit-card"><div className="route-transit-head"><Bus size={22}/><div><b>Ir en colectivo</b><span>Desde tu ubicación hasta {name}</span></div></div><p>Usamos tu ubicación y la ubicación exacta del negocio. Tocá el botón para ver líneas, combinaciones, paradas y horarios disponibles para este viaje.</p><a href={comoLlegoUrl} target="_blank" rel="noopener noreferrer" className="route-transit-btn"><Bus size={17}/> Ver opciones de colectivo <ExternalLink size={15}/></a><small>Vista de prueba. Rosario Market no inventa líneas: las opciones de transporte se consultan al momento de abrir el viaje.</small></div>}
      <button className="route-store-btn" onClick={()=>router.push(`/negocio/${params.id}`)}>Ver tienda</button>
    </section>
  </main>
}