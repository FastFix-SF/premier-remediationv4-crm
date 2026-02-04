import React from 'react';
import RoofingFriendHeader from '../components/RoofingFriendHeader';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import { Button } from '../components/ui/button';
import { CheckCircle, Phone, Home, Building2, Wrench, Zap, Shield, Award, Star, Clock, Sparkles, Truck, HeartHandshake, Hammer, Leaf, Paintbrush, Droplets, Flame, Settings, FileCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useServices, useBusiness } from '@/hooks/useBusinessConfig';

// Icon mapping for service icons
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home, Building2, Wrench, Zap, Shield, Award, Star, Clock, Sparkles, Truck,
  HeartHandshake, Hammer, Leaf, Paintbrush, Droplets, Flame, Settings, FileCheck, CheckCircle
};

const Services = () => {
  const services = useServices();
  const business = useBusiness();

  // Get icon component from string name
  const getIcon = (iconName: string) => {
    return iconMap[iconName] || Wrench;
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`Our Services | ${business.name}`}
        description={`Professional ${services.slice(0, 3).map(s => s.name.toLowerCase()).join(', ')} services. ${business.tagline || ''}`}
      />
      <RoofingFriendHeader />

      <main className="py-8 sm:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12 lg:mb-16">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
              Our Services
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              {business.description || `Professional services from ${business.name}. ${business.certifications?.includes('Licensed') ? 'Licensed, insured, and ' : ''}backed by our commitment to quality.`}
            </p>
          </div>

          {/* Quick Service Links */}
          {services.length > 0 && (
            <div className={`grid sm:grid-cols-2 ${services.length >= 4 ? 'lg:grid-cols-4' : `lg:grid-cols-${Math.min(services.length, 4)}`} gap-4 mb-12`}>
              {services.slice(0, 4).map((service) => (
                <Link
                  key={service.id}
                  to={`/services/${service.slug}`}
                  className="p-4 bg-background border border-border/50 rounded-lg hover:border-primary/50 hover:shadow-md transition-all text-center"
                >
                  <span className="font-medium text-foreground">{service.name}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Services Grid */}
          {services.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12 mb-16">
              {services.map((service) => {
                const IconComponent = getIcon(service.icon);
                return (
                  <div key={service.id} className="bg-card rounded-xl p-6 sm:p-8 shadow-soft border hover:shadow-card-hover transition-shadow">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                        <IconComponent className="w-7 h-7 text-primary" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-foreground">{service.name}</h2>
                    </div>

                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      {service.shortDescription || service.description}
                    </p>

                    {service.benefits && service.benefits.length > 0 && (
                      <div className="space-y-3 mb-6">
                        {service.benefits.slice(0, 6).map((benefit, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                            <span className="text-sm text-muted-foreground">
                              {typeof benefit === 'string' ? benefit : benefit.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <Link to={`/services/${service.slug}`}>
                      <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                        Learn More
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 mb-16">
              <p className="text-muted-foreground">Services information coming soon. Contact us for details.</p>
            </div>
          )}

          {/* Why Choose Us */}
          <div className="bg-primary/5 rounded-2xl p-8 sm:p-12 mb-16">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                Why Choose {business.name}?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                We're committed to delivering exceptional results with every project, backed by our experience and expertise.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {business.uniqueSellingPoints && business.uniqueSellingPoints.length > 0 ? (
                business.uniqueSellingPoints.slice(0, 3).map((usp, index) => (
                  <div key={index} className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      {index === 0 && <Shield className="w-8 h-8 text-primary" />}
                      {index === 1 && <CheckCircle className="w-8 h-8 text-primary" />}
                      {index === 2 && <Zap className="w-8 h-8 text-primary" />}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{usp}</h3>
                  </div>
                ))
              ) : (
                <>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Shield className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Quality Guaranteed</h3>
                    <p className="text-sm text-muted-foreground">
                      Comprehensive service covering all your needs with professional expertise.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {business.certifications?.includes('Licensed') ? 'Licensed & Insured' : 'Professional Team'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {business.certifications?.includes('Licensed')
                        ? 'Fully licensed contractors with comprehensive insurance for your protection.'
                        : 'Experienced professionals dedicated to exceeding your expectations.'}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Fast Response</h3>
                    <p className="text-sm text-muted-foreground">
                      Quick estimates and efficient service to get your project completed on time.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Professional Team Showcase */}
          <div className="bg-primary/5 rounded-2xl p-8 sm:p-12 mb-16">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                  Professional Service Team
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Our team brings years of experience to every project.
                  {business.certifications?.includes('Licensed') ? ' Licensed, insured, and committed to excellence.' : ' Dedicated to quality and customer satisfaction.'}
                </p>
                <div className="space-y-3">
                  {business.certifications && business.certifications.length > 0 ? (
                    business.certifications.slice(0, 4).map((cert, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                        <span className="text-muted-foreground">{cert}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                        <span className="text-muted-foreground">Professional & Experienced Team</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                        <span className="text-muted-foreground">Quality Workmanship</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                        <span className="text-muted-foreground">Customer Satisfaction Focus</span>
                      </div>
                    </>
                  )}
                  {business.yearsInBusiness && (
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                      <span className="text-muted-foreground">{business.yearsInBusiness}+ Years of Experience</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="relative">
                <div className="rounded-xl shadow-lg bg-gradient-to-br from-primary/20 to-primary/5 aspect-video flex items-center justify-center">
                  <div className="text-center p-8">
                    <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
                    <p className="text-foreground font-semibold text-lg">{business.name}</p>
                    <p className="text-muted-foreground text-sm">{business.tagline}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              Contact us today for a free consultation. Our experts are ready to help you with your project.
            </p>
            <Link to="/contact">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3 rounded-lg">
                <Phone className="w-5 h-5 mr-2" />
                Get Free Consultation
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Services;
