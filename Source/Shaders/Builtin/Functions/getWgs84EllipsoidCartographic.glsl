/**
 * @private
 */
#ifdef CARTOGRAPHIC_ENABLED
    varying vec4 v_position;
#endif


vec3 czm_getWgs84EllipsoidCartographic(vec3 wc)
{
    vec3 oneOverRadii = vec3(1.0 / 6378137.0, 1.0 / 6378137.0, 1.0 / 6356752.3142451793);;
    vec3 oneOverRadiiSquared = vec3(1.0 / (6378137.0 * 6378137.0), 1.0 / (6378137.0 * 6378137.0), 1.0 / (6356752.3142451793 * 6356752.3142451793));
    float centerToleranceSquared = czm_epsilon1;

    vec3 p = czm_scaleToGeodeticSurface(wc, oneOverRadii, oneOverRadiiSquared, centerToleranceSquared);
    vec3 n_p = p * oneOverRadiiSquared;
    float magnitude = sqrt(n_p.x * n_p.x + n_p.y * n_p.y + n_p.z * n_p.z);
//  vec3 n_mag = vec3(n.x / magnitude, n.y / magnitude, n.z / magnitude);
    vec3 n = n_p / magnitude;

    vec3 h = wc - p;

//    float longitude = atan2(n.y, n.x);
    float longitude = atan(n.y, n.x);
    float latitude = asin(n.z);
    float height = sign(dot(h, wc)) * sqrt(h.x * h.x + h.y * h.y + h.z * h.z);
    return vec3(longitude, latitude, height);
}
