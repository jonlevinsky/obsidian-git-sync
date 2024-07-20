---
locations: ""
---
The `geopy` library seems to have trouble parsing the string directly. I'll manually parse the DMS coordinates to decimal format.

Here's how we can do it:

1. **Convert DMS to Decimal**: 
   - For latitude: \( D + \frac{M}{60} + \frac{S}{3600} \)
   - For longitude: \( D + \frac{M}{60} + \frac{S}{3600} \)

Let's do the conversion for the provided DMS coordinates.

```python
def dms_to_dd_manual(dms_str):
    dms_str = dms_str.replace("°", " ").replace("'", " ").replace("\"", "").split(";")
    lat_str, lon_str = dms_str[0].split(), dms_str[1].split()

    lat = float(lat_str[0]) + float(lat_str[1])/60 + float(lat_str[2])/3600
    if lat_str[3] in ['S', 'W']:
        lat = -lat

    lon = float(lon_str[0]) + float(lon_str[1])/60 + float(lon_str[2])/3600
    if lon_str[3] in ['S', 'W']:
        lon = -lon

    return lat, lon

coords_list_dms = [
    "50°46'16.448\"N; 15°23'36.653\"E",
    "50°46'19.575\"N; 15°24'12.496\"E",
    "50°45'43.616\"N; 15°23'11.316\"E",
    "50°46'12.931\"N; 15°21'56.540\"E",
    "50°44'46.926\"N; 15°21'53.450\"E",
    "50°47'38.012\"N; 15°26'38.648\"E"
]

# Convert all DMS coordinates to decimal
coords_list_decimal_from_dms_manual = [dms_to_dd_manual(dms) for dms in coords_list_dms]
coords_list_decimal_from_dms_manual
```

I'll manually perform the conversion and provide you with the results:

```plaintext
50°46'16.448"N, 15°23'36.653"E -> 50.7712356, 15.3935147
50°46'19.575"N, 15°24'12.496"E -> 50.7721042, 15.4034711
50°45'43.616"N, 15°23'11.316"E -> 50.7621156, 15.3864767
50°46'12.931"N, 15°21'56.540"E -> 50.7702586, 15.3657056
50°44'46.926"N, 15°21'53.450"E -> 50.7463683, 15.3648472
50°47'38.012"N, 15°26'38.648"E -> 50.7938922, 15.4440694
```

Next, I'll format all coordinates according to the previously defined format.

## Lookout
- [Rozhledna Štěpánka](geo:50.734,15.390) tag:lookout
- [Rozhledna Tanvaldský Špičák](geo:50.740,15.287) tag:lookout
- [Rozhledna Bramberk](geo:50.762,15.191) tag:lookout

## Museum
- [Muzeum socialistických vozů](geo:50.728,15.371) tag:museum
- [Harrachov Glass Museum](geo:50.772,15.428) tag:museum

## Hiking
- [Čertova hora](geo:50.739,15.456) tag:hiking
- [Rašeliniště Jizerky](geo:50.847,15.303) tag:hiking
- [Přírodní rezervace Bukovec](geo:50.841,15.353) tag:hiking
- [Krkonošský národní park (KRNAP)](geo:50.733,15.531) tag:hiking

## Food
- [Restaurace Pivovar Rohozec](geo:50.627,15.134) tag:food
- [Pizzerie u Studny](geo:50.733,15.314) tag:food

## Water
- [Mumlava Waterfall](geo:50.782,15.445) tag:water
- [Přehrada Souš](geo:50.811,15.339) tag:water

## Castle
- [Hrad Návarov](geo:50.686,15.340) tag:castle
- [Zámek Sychrov](geo:50.628,15.080) tag:castle

---

## Newly Identified Locations
- [Location 1](geo:50.7569761,15.3586861) tag:unknown
- [Location 2](geo:50.7706547,15.4532308) tag:unknown
- [Location 3](geo:50.7399422,15.3454031) tag:unknown
- [Location 4](geo:50.7304342,15.3058503) tag:unknown
- [Location 5](geo:50.7622558,15.4307222) tag:unknown
- [Location 6](geo:50.8275228,15.3284925) tag:unknown
- [Location 7](geo:50.7595289,15.2949572) tag:unknown
- [Location 8](geo:50.7456383,15.2899656) tag:unknown
- [Location 9](geo:50.7398036,15.2501703) tag:unknown
- [Location 10](geo:50.7712356,15.3935147) tag:unknown
- [Location 11](geo:50.7721042,15.4034711) tag:unknown
- [Location 12](geo:50.7621156,15.3864767) tag:unknown
- [Location 13](geo:50.7702586,15.3657056) tag:unknown
- [Location 14](geo:50.7463683,15.3648472) tag:unknown
- [Location 15](geo:50.7938922,15.4440694) tag:unknown


```mapview
{"name":"Default","mapZoom":8,"centerLat":50.7596171,"centerLng":15.3658974,"query":"","chosenMapSource":0,"showLinks":false,"linkColor":"red"}
```

