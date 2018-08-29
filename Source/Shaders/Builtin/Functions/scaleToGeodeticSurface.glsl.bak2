/**
 * @private
 */
vec3 czm_scaleToGeodeticSurface(vec3 cartesian, vec3 oneOverRadii, vec3 oneOverRadiiSquared, float centerToleranceSquared)
{

    float positionX = cartesian.x;
    float positionY = cartesian.y;
    float positionZ = cartesian.z;

    float oneOverRadiiX = oneOverRadii.x;
    float oneOverRadiiY = oneOverRadii.y;
    float oneOverRadiiZ = oneOverRadii.z;

    float x2 = positionX * positionX * oneOverRadiiX * oneOverRadiiX;
    float y2 = positionY * positionY * oneOverRadiiY * oneOverRadiiY;
    float z2 = positionZ * positionZ * oneOverRadiiZ * oneOverRadiiZ;

        // Compute the squared ellipsoid norm.
    float squaredNorm = x2 + y2 + z2;
    float ratio = sqrt(1.0 / squaredNorm);

            // As an initial approximation, assume that the radial intersection is the projection point.
    vec3 intersection = cartesian * ratio;

            // If the position is near the center, the iteration will not converge.
    if (squaredNorm < centerToleranceSquared) {
        return intersection;
    }

    float oneOverRadiiSquaredX = oneOverRadiiSquared.x;
    float oneOverRadiiSquaredY = oneOverRadiiSquared.y;
    float oneOverRadiiSquaredZ = oneOverRadiiSquared.z;

            // Use the gradient at the intersection point in place of the true unit normal.
            // The difference in magnitude will be absorbed in the multiplier.
    vec3 gradient;
    gradient.x = intersection.x * oneOverRadiiSquaredX * 2.0;
    gradient.y = intersection.y * oneOverRadiiSquaredY * 2.0;
    gradient.z = intersection.z * oneOverRadiiSquaredZ * 2.0;

            // Compute the initial guess at the normal vector multiplier, lambda.
    float lambda = (1.0 - ratio) * sqrt(cartesian.x * cartesian.x + cartesian.y * cartesian.y + cartesian.z * cartesian.z) / (0.5 * sqrt(gradient.x * gradient.x + gradient.y * gradient.y + gradient.z * gradient.z));
    float correction = 0.0;

    float func;
    float denominator;
    float xMultiplier;
    float yMultiplier;
    float zMultiplier;
    float xMultiplier2;
    float yMultiplier2;
    float zMultiplier2;
    float xMultiplier3;
    float yMultiplier3;
    float zMultiplier3;


    lambda -= correction;

    xMultiplier = 1.0 / (1.0 + lambda * oneOverRadiiSquaredX);
    yMultiplier = 1.0 / (1.0 + lambda * oneOverRadiiSquaredY);
    zMultiplier = 1.0 / (1.0 + lambda * oneOverRadiiSquaredZ);

    xMultiplier2 = xMultiplier * xMultiplier;
    yMultiplier2 = yMultiplier * yMultiplier;
    zMultiplier2 = zMultiplier * zMultiplier;

    xMultiplier3 = xMultiplier2 * xMultiplier;
    yMultiplier3 = yMultiplier2 * yMultiplier;
    zMultiplier3 = zMultiplier2 * zMultiplier;

    func = x2 * xMultiplier2 + y2 * yMultiplier2 + z2 * zMultiplier2 - 1.0;

                // "denominator" here refers to the use of this expression in the velocity and acceleration
                // computations in the sections to follow.
    denominator = x2 * xMultiplier3 * oneOverRadiiSquaredX + y2 * yMultiplier3 * oneOverRadiiSquaredY + z2 * zMultiplier3 * oneOverRadiiSquaredZ;

    float derivative = -2.0 * denominator;

    correction = func / derivative;

//    for(float i = 0.0; abs(func) > 0.000000000001; i=i+1.0){
    for(int i = 0; i<10000; i++){
         lambda =lambda - correction;

         xMultiplier = 1.0 / (1.0 + lambda * oneOverRadiiSquaredX);
         yMultiplier = 1.0 / (1.0 + lambda * oneOverRadiiSquaredY);
         zMultiplier = 1.0 / (1.0 + lambda * oneOverRadiiSquaredZ);

         xMultiplier2 = xMultiplier * xMultiplier;
         yMultiplier2 = yMultiplier * yMultiplier;
         zMultiplier2 = zMultiplier * zMultiplier;

         xMultiplier3 = xMultiplier2 * xMultiplier;
         yMultiplier3 = yMultiplier2 * yMultiplier;
         zMultiplier3 = zMultiplier2 * zMultiplier;

         func = x2 * xMultiplier2 + y2 * yMultiplier2 + z2 * zMultiplier2 - 1.0;

                        // "denominator" here refers to the use of this expression in the velocity and acceleration
                        // computations in the sections to follow.
         denominator = x2 * xMultiplier3 * oneOverRadiiSquaredX + y2 * yMultiplier3 * oneOverRadiiSquaredY + z2 * zMultiplier3 * oneOverRadiiSquaredZ;

         float derivative = -2.0 * denominator;

         correction = func / derivative;

         if(abs(func) < 0.000000000001){
            break;
         }
    }


    return vec3(positionX * xMultiplier, positionY * yMultiplier, positionZ * zMultiplier);
}
