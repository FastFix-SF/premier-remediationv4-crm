import React from 'react';
import { Link } from 'react-router-dom';
import RoofingFriendHeader from '../components/RoofingFriendHeader';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import { MapPin, ChevronRight } from 'lucide-react';
import { useAreas, useBusiness } from '@/hooks/useBusinessConfig';

const AreasPage = () => {
  const areas = useAreas();
  const business = useBusiness();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`Service Areas | ${business.name}`}
        description={`${business.name} proudly serves ${areas.slice(0, 5).map(a => a.name).join(', ')} and surrounding areas.`}
      />
      <RoofingFriendHeader />

      <main className="py-8 sm:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12 lg:mb-16">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
              Our Service Areas
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              {business.name} proudly serves the following communities. Contact us to see if we service your area.
            </p>
          </div>

          {/* Areas Grid */}
          {areas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {areas.map((area) => (
                <Link
                  key={area.slug}
                  to={`/service-areas/${area.slug}`}
                  className="group p-6 bg-card rounded-xl border border-border/50 hover:border-primary/50 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {area.name}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {area.fullName || area.name}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                  {area.description && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                      {area.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <MapPin className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Contact us to learn about our service areas.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AreasPage;
