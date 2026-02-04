import { Navigate } from 'react-router-dom';

// Redirect to dynamic service page
const RoofRepairMaintenance = () => {
  return <Navigate to="/services/roof-repair-maintenance" replace />;
};

export default RoofRepairMaintenance;
