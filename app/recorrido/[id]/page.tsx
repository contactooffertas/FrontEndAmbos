"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MapPin, Navigation, Store } from "lucide-react";
import "../../styles/recorrido.css";

type Point = { lat: number; lng: number };
type RouteData = { coordinates: [number, number][]; distance: number; duration: number };

const haversine = (a: Point, b: Point) => {
  const R = 6371000, rad = (v:number) => v * Math.PI / 180;
  const dLat=rad(b.lat-a.lat), dLng=rad(b.lng-a.lng);
  const x=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
};

const project = (p: Point, all: Point[], w=1000, h=620) => {
  const lats=all.map(x=>x.lat), lngs=all.map(x=>x.lng);
  const minLat=Math.min(...lats), maxLat=Math.max(...lats), minLng=Math.min(...lngs), maxLng=Math.max(...lngs);
  const dx=Math.max(maxLng-minLng,.0005), dy=Math.max(maxLat-minLat,.0005), pad=70;
  return { x: pad+(p.lng-minLng)/dx*(w-pad*2), y: h-pad-(p.lat-minLat)/dy*(h-pad*2) };
};

export default function RecorridoPage() {
  const params=useParams<{id:string}>(), router=useRouter(), search=useSearchParams();
  const destination=useMemo<Point|null>(() => {
    const lat=Number(search.get("lat")), lng=Number(search.get("lng"));
    return Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng}:null;
  },[search]);
  const name=search.get("name") || "Negocio";
  const [user,setUser]=useState<Point|null>(null), [route,setRoute]=useState<RouteData|null>(null);
  const [status,setStatus]=useState("Buscando tu ubicación…");
  const watchRef=useRef<number|null>(null);

  useEffect(()=>{
    if(!destination){setStatus("Este negocio todavía no tiene ubicación cargada.");return;}
    if(!navigator.geolocation){setStatus("Tu dispositivo no permite obtener la ubicación.");return;}
    watchRef.current=navigator.geolocation.watchPosition(
      p=>{setUser({lat:p.coords.latitude,lng:p.coords.longitude});setStatus("Ubicación en vivo");},
      ()=>setStatus("Necesitamos permiso de ubicación para mostrar el recorrido."),
      {enableHighAccuracy:true,maximumAge:5000,timeout:15000}
    );
    return()=>{if(watchRef.current!==null)navigator.geolocation.clearWatch(watchRef.current);};
  },[destination]);

  useEffect(()=>{
    if(!user||!destination)return;
    const controller=new AbortController();
    const url=`https://router.project-osrm.org/route/v1/foot/${user.lng},${user.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
    fetch(url,{signal:controller.signal})
      .then(r=>r.ok?r.json():Promise.reject())
      .then(data=>{const r=data?.routes?.[0]; if(r)setRoute({coordinates:r.geometry.coordinates,distance:r.distance,duration:r.duration});})
      .catch(()=>setRoute({coordinates:[[user.lng,user.lat],[destination.lng,destination.lat]],distance:haversine(user,destination),duration:haversine(user,destination)/1.3}));
    return()=>controller.abort();
  },[user?.lat,user?.lng,destination?.lat,destination?.lng]);

  const routePoints=(route?.coordinates||[]).map(([lng,lat])=>({lat,lng}));
  const all=user&&destination?[user,destination,...routePoints]:[];
  const polyline=all.length?routePoints.map(p=>{const q=project(p,all);return `${q.x},${q.y}`;}).join(" "):"";
  const userXY=user&&all.length?project(user,all):null, destXY=destination&&all.length?project(destination,all):null;
  const meters=route?.distance ?? (user&&destination?haversine(user,destination):0);
  const near=meters>0&&meters<=300;
  const distanceLabel=meters<1000?`${Math.round(meters)} m`:`${(meters/1000).toFixed(1)} km`;
  const minutes=Math.max(1,Math.round((route?.duration||meters/1.3)/60));

  return <main className="route-page">
    <header className="route-header"><button onClick={()=>router.back()} aria-label="Volver"><ArrowLeft/></button><div><strong>Cómo llegar</strong><span>{name}</span></div></header>
    <section className="route-map">
      <svg viewBox="0 0 1000 620" role="img" aria-label={`Recorrido hasta ${name}`}>
        <defs><pattern id="grid" width="90" height="90" patternUnits="userSpaceOnUse"><path d="M 90 0 L 0 0 0 90" className="street-grid"/></pattern></defs>
        <rect width="1000" height="620" className="map-bg"/><rect width="1000" height="620" fill="url(#grid)"/>
        {polyline&&<polyline points={polyline} className="route-line"/>}
        {userXY&&<g transform={`translate(${userXY.x} ${userXY.y})`}><circle r="24" className="user-halo"/><circle r="11" className="user-dot"/><text y="-32" textAnchor="middle">Vos</text></g>}
        {destXY&&<g transform={`translate(${destXY.x} ${destXY.y})`}><circle r="17" className="dest-dot"/><text y="-28" textAnchor="middle">{name.slice(0,22)}</text></g>}
      </svg>
      <div className="route-live"><Navigation size={14}/>{status}</div>
    </section>
    <section className="route-sheet">
      <div className="route-title"><div className="route-store-icon"><Store/></div><div><h1>{name}</h1><p><MapPin size={14}/> destino seleccionado</p></div></div>
      {user&&destination&&<><div className="route-stats"><div><b>{distanceLabel}</b><span>distancia restante</span></div><div><b>~{minutes} min</b><span>caminando</span></div></div>
      <div className={near?"route-near active":"route-near"}>{near?<><b>¡Estás cerca!</b><span>{name} está a {distanceLabel}.</span></>:<><b>Seguí acercándote</b><span>Te avisamos visualmente al entrar en el radio de 300 m.</span></>}</div></>}
      <button className="route-store-btn" onClick={()=>router.push(`/negocio/${params.id}`)}>Ver tienda</button>
    </section>
  </main>;
}
